// @file src/index.ts
// @description dsh-plugin-audit 的 host 半边：一个 cordis 插件，
//              注册 /plugin-audit 人类命令，读取 Loader 当前条目并按来源分组输出。
//
// 为什么这样做：官方 Web UI 的「插件列表」tab 是只读的，且官方
// @deepseek-ai/dsh-client-ui-settings-plugin-inventory 明确不做来源分组
// （其 README 的 Known Limitations 写明 "grouping by source" 是 deferred work）。
// 最稳、最可逆的等价方案是：新增一个 cordis 插件，通过 dsh 的命令注册机制
// （ctx.commands.register，见 @deepseek-ai/dsh-commands）暴露一条 /plugin-audit 命令，
// 在 Web UI 的聊天里、以及任何交互式 UI 适配器里都能用。
//
// 类型说明：这里用「最小结构类型」描述 ctx，而不是 import '@deepseek-ai/cordis' 的
// Context，目的是让本插件在没有本地 dsh 源码 checkout 的情况下也能 tsc 通过、
// 也能被 esbuild 独立打包（社区插件 dsh-at-file 用 link: 到本地 dsh，这里省掉该硬依赖）。

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

import { classifyEntry, groupByOrigin } from './classify';
import type { ClassifiedEntry, LoaderEntryShape } from './classify';
import { renderGroups } from './render';
import { profilePatchPath, togglePatchFile } from './patch';

export const name = 'plugin-audit';

// Loader 服务（读条目）+ commands 服务（注册命令）。这是 cordis 的 inject 契约。
export const inject = ['loader', 'commands'];

/** Loader 服务的最小结构：只需要 entries() 与 update()。 */
interface LoaderService {
  entries(): Iterable<LoaderEntryShape>;
  /** 运行时更新条目（disabled 会立即停用/启用 fiber）。 */
  update(id: string, options: { disabled?: boolean }): Promise<void>;
}

/** commands 服务的最小结构：只需要 register()。 */
interface CommandsService {
  register(def: CommandDefinition): () => void;
}

interface CommandDefinition {
  name: string;
  description: string;
  input?: { hint?: string };
  handler: (invocation: { rawInput: string }) => CommandResult | Promise<CommandResult>;
}

type CommandResult = { kind: 'success' | 'error'; text: string };

/** 本插件的最小上下文（只声明它用到的两个服务）。 */
export interface PluginContext {
  loader: LoaderService;
  commands: CommandsService;
}

/** 本插件的配置（见 cordis.patch.yml 里的 config）。 */
export interface OriginConfig {
  /** 显式的「来源覆盖」白名单：把这些包名强制判定为「自装」。默认空数组。 */
  extraUserPackages?: string[];
}

/**
 * 尽力读取「用户显式安装的包名集合」。
 *
 * dsh 的 `dsh plugin --profile <name> add <pkg>` 底层是 pnpm，会把包写进
 * `<profile>/package.json` 的 `dependencies`。官方 bundle（@deepseek-ai/dsh-base 等）
 * 由安装器自带，绝不会作为 profile 的直接依赖出现，因此「dependencies 里的包名」
 * 就是「用户自装」的可靠信号之一。
 *
 * 插件运行在某个 profile 进程里，但 Loader 不暴露当前 profile 名，
 * 这里做一个保守近似：扫描 $DSH_HOME/profiles/* 的 dependencies 并集。
 *   - 单 profile（绝大多数情况）：结果与真实一致。
 *   - 多 profile：可能把一个 profile 的依赖误标到另一个 profile，
 *     此时请用 config.extraUserPackages 显式声明（它是权威覆盖）。
 *
 * @param home dsh 主目录（$DSH_HOME 或 ~/.dsh）
 */
function readUserDependencies(home: string | undefined): Set<string> {
  const set = new Set<string>();
  if (!home) return set;
  const profilesDir = join(home, 'profiles');
  if (!existsSync(profilesDir)) return set;
  try {
    for (const dirent of readdirSync(profilesDir, { withFileTypes: true })) {
      // 只关心目录（profile 就是一个目录；符号链接目录也兼容）。
      if (!dirent.isDirectory() && !dirent.isSymbolicLink()) continue;
      const manifestPath = join(profilesDir, dirent.name, 'package.json');
      if (!existsSync(manifestPath)) continue;
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
          dependencies?: Record<string, string>;
        };
        for (const key of Object.keys(manifest.dependencies ?? {})) set.add(key);
      } catch {
        // 单个 profile 的 manifest 读取失败不影响整体，跳过即可。
      }
    }
  } catch {
    // 扫描失败时退化为空集，分类仍按「作用域前缀」规则进行，不会崩溃。
  }
  return set;
}

type View = 'summary' | 'user' | 'official' | 'query';
type Action = 'view' | 'disable' | 'enable';

interface Parsed {
  action: Action;
  view: View;
  query: string;
}

/**
 * 解析 /plugin-audit 的入参。
 *
 * 支持：
 *   /plugin-audit                  → 概览
 *   /plugin-audit user|official    → 只看某组
 *   /plugin-audit <关键词>          → 过滤
 *   /plugin-audit disable <关键词>  → 停用匹配到的自装插件（持久化）
 *   /plugin-audit enable <关键词>   → 启用匹配到的自装插件（持久化）
 */
function parseInput(rawInput: string): Parsed {
  const input = rawInput.trim();
  if (input === '') return { action: 'view', view: 'summary', query: '' };
  if (/^user$/i.test(input)) return { action: 'view', view: 'user', query: '' };
  if (/^official$/i.test(input)) return { action: 'view', view: 'official', query: '' };
  const toggle = /^(disable|enable)\s+(.+)$/i.exec(input);
  if (toggle) {
    return {
      action: toggle[1].toLowerCase() === 'disable' ? 'disable' : 'enable',
      view: 'query',
      query: toggle[2].toLocaleLowerCase(),
    };
  }
  return { action: 'view', view: 'query', query: input.toLocaleLowerCase() };
}

/** 一个条目是否匹配关键词（包名或 entry id 包含）。 */
function matches(entry: ClassifiedEntry, query: string): boolean {
  return (
    entry.moduleName.toLocaleLowerCase().includes(query) ||
    entry.entryId.toLocaleLowerCase().includes(query)
  );
}

/** 主分类流程：读 Loader → 过滤 group 行 → 分类。 */
function snapshot(ctx: PluginContext, extraUserPackages: ReadonlySet<string>): ClassifiedEntry[] {
  const classified: ClassifiedEntry[] = [];
  for (const entry of ctx.loader.entries()) {
    // 跳过结构性的 group 行（与官方 plugin-inventory 的 list() 行为一致）。
    if (entry.options.group) continue;
    classified.push(classifyEntry(entry, extraUserPackages));
  }
  return classified;
}

/**
 * 从 Loader 根条目反推当前 profile 的 cordis.patch.yml 绝对路径。
 *
 * include 根条目（name === 'cordis:include'）的 config.path 是
 * profile/cordis.yml 的 file:// URL，patch 文件就在同目录。
 */
function findProfilePatchPath(ctx: PluginContext): string | null {
  for (const entry of ctx.loader.entries()) {
    if (entry.options.name !== 'cordis:include') continue;
    const config = entry.options.config as { path?: string } | undefined;
    if (config?.path) return profilePatchPath(config.path);
  }
  return null;
}

/**
 * 执行 disable/enable：找到唯一匹配的自装插件 → 写 cordis.patch.yml（持久化）
 * + ctx.loader.update（运行时立即生效）。
 *
 * 为什么两条腿都要：web profile 里官方禁用了 `hmr` 行（dsh-web-app 的 patch），
 * 写 patch 文件未必触发重载；`ctx.loader.update(id, { disabled })` 走 entry.update
 * 的 fiber 重启路径，与 HMR 状态无关，立即停用/启用。写文件保证下次 boot 仍保持。
 *
 * 安全边界（按用户需求）：只允许操作「自装」插件；官方/内置插件拒绝。
 * 匹配到多个 → 提示列出候选，要求用更精确的关键词或完整 entryId。
 */
async function runToggle(
  ctx: PluginContext,
  classified: ClassifiedEntry[],
  query: string,
  disabled: boolean,
  patchPath: string | null,
): Promise<CommandResult> {
  const candidates = classified.filter((e) => e.origin === 'user' && matches(e, query));
  const verb = disabled ? '停用' : '启用';

  if (candidates.length === 0) {
    // 确认不是匹配到了官方/内置插件（可能是关键词太宽或目标在别的来源组）
    const officialHit = classified.filter((e) => e.origin !== 'user' && matches(e, query));
    const hint =
      officialHit.length > 0
        ? `匹配到 ${officialHit.length} 个非自装插件（${officialHit.map((e) => e.entryId).join('、')}）。` +
          '安全边界：只能操作自装插件。'
        : '没有匹配到任何自装插件。';
    return { kind: 'error', text: `${verb}失败：${hint}` };
  }
  if (candidates.length > 1) {
    const list = candidates.map((e) => `  ${e.entryId} (${e.moduleName})`).join('\n');
    return {
      kind: 'error',
      text: `匹配到 ${candidates.length} 个插件，请用完整 entry id 或更精确的关键词：\n${list}`,
    };
  }

  const target = candidates[0];
  if (target.entryId === 'plugin-audit' || target.moduleName === 'dsh-plugin-audit') {
    return { kind: 'error', text: `不能${verb}本插件自身（会中断命令执行）` };
  }
  if (patchPath === null) {
    return { kind: 'error', text: `${verb} ${target.entryId} 失败：找不到 profile 的 cordis.patch.yml` };
  }
  try {
    // 1) 持久化：写 profile 的 cordis.patch.yml（下次 boot 保持）
    const result = togglePatchFile(patchPath, target.entryId, disabled);
    // 2) 即时生效：直接更新 loader fiber（不依赖 HMR）
    await ctx.loader.update(target.entryId, { disabled });
    return {
      kind: 'success',
      text: `${verb} ${target.entryId}（${target.moduleName}）：${result.message}，运行时已生效`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: 'error', text: `${verb} ${target.entryId} 失败：${message}` };
  }
}

/** 组装并渲染最终文本。 */
function render(classified: ReturnType<typeof snapshot>, parsed: Parsed): string {
  const { view, query } = parsed;
  const groups = groupByOrigin(classified);
  if (view === 'user') {
    return renderGroups({ official: [], user: groups.user, builtin: [] }, { withReason: true });
  }
  if (view === 'official') {
    return renderGroups({ official: groups.official, user: [], builtin: [] }, { listOfficial: true });
  }
  if (view === 'query') {
    const matched = classified.filter((e) => matches(e, query));
    return renderGroups(groupByOrigin(matched), { withReason: true, listOfficial: true, listBuiltin: true });
  }
  // 默认概览：自装逐行 + 官方计数。
  return renderGroups(groups, { withReason: true });
}

/**
 * cordis 插件的入口。
 *
 * @param ctx cordis 上下文（注入 loader 与 commands 服务）
 * @param config 本插件的配置（见 cordis.patch.yml）
 */
export function apply(ctx: PluginContext, config: OriginConfig = {}): void {
  // 1) 组装「用户显式安装集」：显式白名单 ∪ 尽力扫描到的 profile dependencies。
  const extraUserPackages = new Set<string>(config.extraUserPackages ?? []);

  // dsh 主目录：优先 $DSH_HOME，否则 ~/.dsh（与 @deepseek-ai/dsh-home-paths 一致）。
  const home = process.env.DSH_HOME || resolve(homedir(), '.dsh');
  for (const pkg of readUserDependencies(home)) extraUserPackages.add(pkg);

  // 2) 注册 /plugin-audit 命令。返回的 disposer 由 cordis 在插件卸载时调用。
  ctx.commands.register({
    name: 'plugin-audit',
    description: '按来源（官方 / 自装）分组查看插件；disable/enable 控制自装插件开关',
    input: { hint: '[user|official|<关键词>|disable <关键词>|enable <关键词>]' },
    handler: async ({ rawInput }) => {
      try {
        const parsed = parseInput(rawInput);
        const classified = snapshot(ctx, extraUserPackages);
        if (parsed.action === 'disable' || parsed.action === 'enable') {
          const patchPath = findProfilePatchPath(ctx);
          return await runToggle(ctx, classified, parsed.query, parsed.action === 'disable', patchPath);
        }
        return { kind: 'success', text: render(classified, parsed) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { kind: 'error', text: `/plugin-audit 执行失败：${message}` };
      }
    },
  });
}
