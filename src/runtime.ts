// @file src/runtime.ts
// @description host 侧 pluginAudit remote service：「插件目录」面板的开关按钮与
//              更新功能通过它调用。TypertRemoteService 子类 + @Remote 方法
//              （dsh-at-file 同款手写模式，见 src/typert.ts 的 manifest 注册）。
//
// 安全边界与命令版一致：只允许操作「自装」插件；官方/内置拒绝；不能操作本插件自身。

import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Context } from '@deepseek-ai/cordis';

import type { CheckUpdatesResult, ToggleResult, UpdateResult } from './contract';
import type { ClassifiedEntry } from './classify';
import { performToggle } from './toggle';
import type { ToggleLoader } from './toggle';
import { executeCheckUpdates as checkUpdatesCore, executeUpdate as updateCore } from './updates';
import { localizeDescription } from './translations';

/** runtime 依赖：分类快照、patch 路径、loader（前两者用函数惰性读取，跟随运行时变化）。 */
export interface RuntimeDeps {
  /** 当前已分类的插件列表（校验目标是自装插件用）。 */
  classified(): ClassifiedEntry[];
  /** profile 的 cordis.patch.yml 绝对路径；null 表示未定位到。 */
  patchPath(): string | null;
  /** loader 服务（即时生效用）。 */
  loader: ToggleLoader;
  /** 当前 profile 目录（更新时 pnpm 的 cwd；从 patchPath 反推）。 */
  profileDir(): string | null;
  /** web.fetch 能力（registry 探测用）。 */
  fetchJson(url: string): Promise<{ ok: boolean; json: unknown }>;
  /** 读已装版本与描述（node_modules/<pkg>/package.json）。 */
  readPackageJson(moduleName: string): Promise<{ version: string; description?: string } | undefined>;
  /** subprocess 能力（pnpm update 用）。 */
  spawnRun(
    command: string,
    args: string[],
    cwd: string,
  ): Promise<{ exitCode: number | null; output: string; spawnError?: string }>;
}

/** 从 deps 里提取「自装插件」的模块名列表（排除本插件自身）。 */
function userModuleNames(deps: RuntimeDeps): string[] {
  const names: string[] = [];
  for (const entry of deps.classified()) {
    if (entry.origin !== 'user') continue;
    if (entry.configId === 'plugin-audit' || entry.moduleName === 'dsh-plugin-Audit') continue;
    names.push(entry.moduleName);
  }
  // 去重（同一包名可能以多个 entry 出现）。
  return [...new Set(names)];
}

/**
 * pluginAudit 的开关核心（与 cordis/typert 无关的纯逻辑，可单测）：
 * 校验目标存在、是自装、非本插件自身，然后执行持久化 + 即时生效。
 */
export async function executeToggle(
  deps: RuntimeDeps,
  entryId: string,
  disabled: boolean,
): Promise<ToggleResult> {
  const target = deps.classified().find((e) => e.entryId === entryId);
  if (!target) throw new Error(`未知插件 entry：${entryId}`);
  if (target.origin !== 'user') {
    throw new Error(`安全边界：${entryId} 不是自装插件，只能操作自装插件`);
  }
  // 保护必须对「带 loader 前缀的完整 id」也生效：client 传的 entryId 是
  // `include:plugin-audit` 这种完整 id，而配置行原始 id 是 `plugin-audit`。
  // 直接比较 entryId 会因前缀永远不命中，导致能停用/启用本插件自身
  // （v0.5 修复：用 target.configId / moduleName 判定）。
  if (target.configId === 'plugin-audit' || target.moduleName === 'dsh-plugin-Audit') {
    throw new Error('不能停用/启用本插件自身');
  }
  const patchPath = deps.patchPath();
  if (patchPath === null) {
    throw new Error('找不到 profile 的 cordis.patch.yml');
  }
  // patch 文件按配置行原始 id（configId）匹配；loader.update 用完整 id（entryId）。
  const message = await performToggle(deps.loader, entryId, target.configId, disabled, patchPath);
  return { entryId, disabled, message };
}

/**
 * 检查更新（纯只读）：对每个自装插件读已装版本 + 探测 npm registry。
 *
 * @param deps runtime 依赖
 * @returns 更新状态列表；无自装插件时 packages 为空数组
 */
export async function executeCheckUpdates(deps: RuntimeDeps): Promise<CheckUpdatesResult> {
  const profileDir = deps.profileDir();
  if (profileDir === null) {
    throw new Error('找不到 profile 目录（无法解析 node_modules 与 pnpm 上下文）');
  }
  return checkUpdatesCore({
    profileDir,
    moduleNames: userModuleNames(deps),
    fetch: { fetchJson: deps.fetchJson },
    read: { readPackageJson: deps.readPackageJson },
    spawn: { run: deps.spawnRun },
  });
}

/**
 * 执行更新：校验目标都是自装插件且非本插件自身，然后 pnpm update。
 *
 * @param deps runtime 依赖
 * @param moduleNames 要更新的插件包名列表
 * @returns 更新结果（退出码 + 截断输出）
 * @throws 有目标不是自装插件、是插件自身、或 profile 目录定位失败时
 */
export async function executeUpdateRemote(deps: RuntimeDeps, moduleNames: string[]): Promise<UpdateResult> {
  const userNames = new Set(userModuleNames(deps));
  const unknown = moduleNames.filter((name) => !userNames.has(name));
  if (unknown.length > 0) {
    throw new Error(`安全边界：${unknown.join('、')} 不是自装插件（或为本插件自身），只能更新自装插件`);
  }
  // 空输入无意义（client 已保证非空，这里兜底）。
  const targets = [...new Set(moduleNames)].filter((name) => userNames.has(name));
  if (targets.length === 0) throw new Error('没有可更新的自装插件');
  const profileDir = deps.profileDir();
  if (profileDir === null) {
    throw new Error('找不到 profile 目录（无法执行 pnpm update）');
  }
  const result = await updateCore({
    profileDir,
    moduleNames: targets,
    fetch: { fetchJson: deps.fetchJson },
    read: { readPackageJson: deps.readPackageJson },
    spawn: { run: deps.spawnRun },
  });
  return { ...result, updated: result.ok ? targets : [] };
}

/**
 * 读取插件的功能描述（只读）：优先内置中英字典（随系统语言），字典没有的
 * 从 node_modules/<pkg>/package.json 读英文 description 兜底（zh=en）。
 *
 * @param deps runtime 依赖
 * @param moduleNames 要查的模块名列表（可为空 → 返回空 map）
 * @returns moduleName → { zh, en } 双语描述
 */
export async function executeDescriptions(
  deps: RuntimeDeps,
  moduleNames: string[],
): Promise<Record<string, { zh: string; en: string }>> {
  const result: Record<string, { zh: string; en: string }> = {};
  for (const name of new Set(moduleNames)) {
    const manifest = await deps.readPackageJson(name);
    const en = typeof manifest?.description === 'string' ? manifest.description : '';
    result[name] = localizeDescription(name, en);
  }
  return result;
}

/**
 * pluginAudit 命名空间的 host 实现，注册在 `pluginAudit` 服务键下。
 */
export class PluginAuditRuntime extends TypertRemoteService {
  constructor(ctx: Context, private readonly deps: RuntimeDeps) {
    super(ctx, 'pluginAudit');
  }

  /**
   * 停用/启用一个自装插件。
   *
   * @param entryId Loader 条目 id
   * @param disabled true=停用，false=启用
   * @returns 操作结果（成功后 entryId/disabled/message）
   * @throws 目标不是自装插件、是插件自身、或 patch 文件定位失败时
   */
  @Remote
  async toggle(entryId: string, disabled: boolean): Promise<ToggleResult> {
    return executeToggle(this.deps, entryId, disabled);
  }

  /**
   * 检查自装插件是否有可用更新（只读）。
   *
   * @returns 每个自装插件的已装/最新版本与 outdated 标记
   */
  @Remote
  async checkUpdates(): Promise<CheckUpdatesResult> {
    return executeCheckUpdates(this.deps);
  }

  /**
   * 更新一个或多个自装插件（在 profile 目录跑 pnpm update）。
   *
   * @param moduleNames 目标插件包名（如 `@linxin666/dsh-ssh`、`dshmarket`）
   * @returns pnpm 执行结果
   * @throws 目标含非自装插件 / 本插件自身 / profile 定位失败时
   */
  @Remote
  async update(moduleNames: string[]): Promise<UpdateResult> {
    return executeUpdateRemote(this.deps, moduleNames);
  }

  /**
   * 读取插件功能描述（只读）：返回双语 { zh, en }，client 按系统语言选择。
   *
   * @param moduleNames 要查的模块名列表
   * @returns moduleName → { zh, en }
   */
  @Remote
  async descriptions(moduleNames: string[]): Promise<Record<string, { zh: string; en: string }>> {
    return executeDescriptions(this.deps, moduleNames);
  }
}
