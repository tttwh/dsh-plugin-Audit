// @file src/index.ts
// @description dsh-plugin-Audit 的 host 半边：一个 cordis 插件，提供两个面：
//              ① /plugin-audit 人类命令（聊天框分组查看 + disable/enable 开关）；
//              ② pluginAudit remote（设置页「来源」tab 的开关按钮走它）。
//
// 为什么这样做：官方 Web UI 的「插件列表」tab 是只读的，且官方
// @deepseek-ai/dsh-client-ui-settings-plugin-inventory 明确不做来源分组
// （其 README 的 Known Limitations 写明 "grouping by source" 是 deferred work）。
// 所以新增一个 tab（settings.plugins.tab 插槽）+ 自建 mutation remote。
//
// 类型说明：这里用「最小结构类型」描述 ctx，而不是 import '@deepseek-ai/cordis' 的
// Context，目的是让本插件在没有本地 dsh 源码 checkout 的情况下也能 tsc 通过、
// 也能被 esbuild 独立打包（社区插件 dsh-at-file 用 link: 到本地 dsh，这里省掉该硬依赖）。
// 例外：runtime.ts 的 PluginAuditRuntime extends TypertRemoteService，那里才 import
// cordis Context 类型（devDependency，构建时 external，由 dsh host 提供）。

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

import { classifyEntry, groupByOrigin } from './classify';
import type { ClassifiedEntry, LoaderEntryShape } from './classify';
import { renderGroups } from './render';
import { profilePatchPath } from './patch';
import { matchUserPlugin, performToggle } from './toggle';
import { TYPERT_MANIFEST } from './typert';
import { PluginAuditRuntime } from './runtime';

export const name = 'plugin-audit';

// Loader 服务（读条目/更新）+ commands 服务（注册命令）+ typert 注册表（remote 通道）
// + subprocess（pnpm update）。registry 探测用全局 fetch，不依赖 web 服务。
export const inject = ['loader', 'commands', 'typert', 'subprocess'];

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

/** typert 注册表服务的最小结构（remote 通道注册用）。 */
interface TypertService {
  register(manifest: unknown): () => void;
}

/** subprocess 服务的最小结构（pnpm update 用 spawn；字段与 dsh-subprocess 契约对齐）。 */
interface SubprocessService {
  spawn(spec: {
    argv: readonly string[];
    cwd: string;
    stdio: {
      stdin: 'ignore' | 'pipe' | { readonly data: string };
      stdout: 'pipe' | 'inherit' | { maxBytes: number };
      stderr: 'pipe' | 'inherit' | { maxBytes: number };
    };
    graceMs: number;
    signal?: AbortSignal;
    env?: Record<string, string>;
  }): {
    pid: number;
    collected: {
      stdout?: { readFrom(fromByte: number): { text: string; nextOffset: number } };
      stderr?: { readFrom(fromByte: number): { text: string; nextOffset: number } };
    };
    done: Promise<{ exitCode: number | null; signal: string | null }>;
    terminate(): void;
  };
}

/** 本插件的最小上下文（只声明它用到的服务）。 */
export interface PluginContext {
  loader: LoaderService;
  commands: CommandsService;
  typert?: TypertService;
  subprocess?: SubprocessService;
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
 * + ctx.loader.update（运行时立即生效）。核心逻辑见 toggle.ts（与 remote 版共用）。
 *
 * 安全边界（按用户需求）：只允许操作「自装」插件；官方/内置插件拒绝。
 * 匹配到多个 → 提示列出候选，要求用更精确的关键词或完整 entryId。
 */
async function runToggle(
  ctx: PluginContext,
  classified: ClassifiedEntry[],
  extraUserPackages: ReadonlySet<string>,
  query: string,
  disabled: boolean,
  patchPath: string | null,
): Promise<CommandResult> {
  const candidates = matchUserPlugin(classified, query);
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
  // 与 runtime.ts 的 executeToggle 一致：entryId 带 loader 前缀（include:plugin-audit），
  // 不能直接和 'plugin-audit' 比较；用 configId / moduleName 判定（v0.5 修复）。
  if (target.configId === 'plugin-audit' || target.moduleName === 'dsh-plugin-Audit') {
    return { kind: 'error', text: `不能${verb}本插件自身（会中断命令执行）` };
  }
  if (patchPath === null) {
    return { kind: 'error', text: `${verb} ${target.entryId} 失败：找不到 profile 的 cordis.patch.yml` };
  }
  try {
    // patch 文件按配置行原始 id 匹配，loader.update 用 Loader 树完整 id（v0.4 修复）
    // currentDisabled：写文件后实时查 loader 树里该条目的 disabled 状态，
    // 供 performToggle 判断 HMR 是否已生效（v0.7 双通道修复）。
    const currentDisabled = (): boolean | undefined => {
      const entry = snapshot(ctx, extraUserPackages).find((e) => e.entryId === target.entryId);
      return entry === undefined ? undefined : !entry.enabled;
    };
    const message = await performToggle(ctx.loader, target.entryId, target.configId, disabled, patchPath, currentDisabled);
    return { kind: 'success', text: `${verb} ${target.entryId}（${target.moduleName}）：${message}` };
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
          return await runToggle(ctx, classified, extraUserPackages, parsed.query, parsed.action === 'disable', patchPath);
        }
        return { kind: 'success', text: render(classified, parsed) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { kind: 'error', text: `/plugin-audit 执行失败：${message}` };
      }
    },
  });

  // 3) 注册 pluginAudit remote：「插件目录」面板的开关 + 更新按钮走这条通道。
  //    TypertRemoteService 构造器要求 cordis Context，这里用结构类型 ctx 传入
  //    （类型断言：运行时就是同一个 cordis 上下文）。
  if (ctx.typert) {
    ctx.typert.register(TYPERT_MANIFEST);

    // profile 目录：从 patch 文件路径反推（patch 就在 profile 目录里）。
    const profileDir = (): string | null => {
      const patchPath = findProfilePatchPath(ctx);
      if (patchPath === null) return null;
      return patchPath.slice(0, patchPath.lastIndexOf('/'));
    };

    // registry 探测：走全局 fetch（host 是 Node ≥22，dsh-remote-web-ui 同款；
    // 系统 web 服务的 fetch provider 在本部署未注册，不可用）。失败时返回空 JSON。
    // 超时用 Promise 竞速实现（不依赖 AbortController，兼容受限执行环境）。
    const fetchJson = async (url: string): Promise<{ ok: boolean; json: unknown }> => {
      if (typeof globalThis.fetch !== 'function') return { ok: false, json: null };
      const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 10 * 1000));
      try {
        const raced = await Promise.race([globalThis.fetch(url), timeout]);
        if (raced === 'timeout') return { ok: false, json: null };
        const response = raced as Response;
        if (!response.ok) return { ok: false, json: null };
        const text = await response.text();
        try {
          return { ok: true, json: JSON.parse(text) };
        } catch {
          return { ok: false, json: null };
        }
      } catch {
        return { ok: false, json: null };
      }
    };

    // 读已装版本与描述：优先 profile/node_modules/<pkg>/package.json（自装插件），
    // 官方插件由安装器放在 $DSH_HOME/profiles/node_modules（profiles 共享层，
    // 不在 profile 自己的 node_modules 里），所以两个位置都要查。
    const readPackageJson = async (
      moduleName: string,
    ): Promise<{ version: string; description?: string } | undefined> => {
      const dir = profileDir();
      if (dir === null) return undefined;
      // 候选目录：profile/node_modules → profiles 共享 node_modules。
      const candidates = [join(dir, 'node_modules'), join(dirname(dir), 'node_modules')];
      for (const candidate of candidates) {
        const manifestPath = join(candidate, moduleName, 'package.json');
        try {
          if (!existsSync(manifestPath)) continue;
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
            version?: unknown;
            description?: unknown;
          };
          if (typeof manifest.version !== 'string') continue;
          return typeof manifest.description === 'string' && manifest.description.length > 0
            ? { version: manifest.version, description: manifest.description }
            : { version: manifest.version };
        } catch {
          continue;
        }
      }
      return undefined;
    };

    // pnpm update：subprocess.spawn 一条命令（collect 模式收集输出），返回退出码。
    // 命令不存在（ENOENT）→ spawnError 置位，由 updates.ts 尝试下一个候选。
    // graceMs 用 10 秒（SIGTERM → KILL 的升级间隔）；输出上限 16KB 保尾。
    // 总超时 10 分钟：pnpm 更新多包时可能较慢（下载新版本），超时 terminate 并报错。
    //
    // env 里注入 npm_config_minimumReleaseAge=0：pnpm 11 默认对「发布不足 3 天」
    // 的新版本做 supply-chain 拦截（workspace 的 minimumReleaseAgeExclude 只排除了
    // 0.1.10 等旧版），导致 `pnpm add <pkg>@latest` 输出 "Already up to date"、
    // 升不到 registry 最新——这就是「更新不了」的根因（v0.6 实测定位）。显式设 0
    // 关闭该限制，让 @latest 真正解析到最新版本。
    const spawnRun = async (
      command: string,
      args: string[],
      cwd: string,
    ): Promise<{ exitCode: number | null; output: string; spawnError?: string }> => {
      if (ctx.subprocess === undefined) {
        return { exitCode: null, output: '', spawnError: 'subprocess 服务不可用' };
      }
      try {
        const handle = ctx.subprocess.spawn({
          argv: [command, ...args],
          cwd,
          env: { npm_config_minimumReleaseAge: '0' },
          stdio: {
            stdin: 'ignore',
            stdout: { maxBytes: 16 * 1024 },
            stderr: { maxBytes: 16 * 1024 },
          },
          graceMs: 10 * 1000,
        });
        // 总超时：10 分钟到点 terminate 进程树（updates.ts 会把它当失败返回）。
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          handle.terminate();
        }, 10 * 60 * 1000);
        try {
          const exit = await handle.done.catch(() => null);
          // 进程结束后读收集缓冲区（offset 0 = 全量尾部）。
          let output = '';
          const stdout = handle.collected.stdout?.readFrom(0).text ?? '';
          const stderr = handle.collected.stderr?.readFrom(0).text ?? '';
          output = stdout + stderr;
          if (output.length > 16 * 1024) output = output.slice(output.length - 16 * 1024);
          if (timedOut) return { exitCode: null, output, spawnError: 'update timed out after 10 minutes' };
          return { exitCode: exit?.exitCode ?? null, output };
        } finally {
          clearTimeout(timer);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/ENOENT|not found|not recognized/i.test(message)) {
          return { exitCode: null, output: '', spawnError: message };
        }
        return { exitCode: null, output: '', spawnError: message };
      }
    };

    new PluginAuditRuntime(
      ctx as never,
      {
        classified: () => snapshot(ctx, extraUserPackages),
        patchPath: () => findProfilePatchPath(ctx),
        loader: ctx.loader,
        profileDir,
        fetchJson,
        readPackageJson,
        spawnRun,
      },
    );
  }
}
