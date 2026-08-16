// @file src/runtime.ts
// @description host 侧 pluginAudit remote service：设置页「来源」tab 的开关按钮
//              通过它调用。TypertRemoteService 子类 + @Remote 方法（dsh-at-file
//              同款手写模式，见 src/typert.ts 的 manifest 注册）。
//
// 安全边界与命令版一致：只允许操作「自装」插件；官方/内置拒绝；不能操作本插件自身。

import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Context } from '@deepseek-ai/cordis';

import type { ToggleResult } from './contract';
import type { ClassifiedEntry } from './classify';
import { performToggle } from './toggle';
import type { ToggleLoader } from './toggle';

/** runtime 依赖：分类快照、patch 路径、loader（前两者用函数惰性读取，跟随运行时变化）。 */
export interface RuntimeDeps {
  /** 当前已分类的插件列表（校验目标是自装插件用）。 */
  classified(): ClassifiedEntry[];
  /** profile 的 cordis.patch.yml 绝对路径；null 表示未定位到。 */
  patchPath(): string | null;
  /** loader 服务（即时生效用）。 */
  loader: ToggleLoader;
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
}
