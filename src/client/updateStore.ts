// @file src/client/updateStore.ts
// @description 模块级「更新任务」store：把更新状态从面板组件生命周期中提升出来，
//              让「关闭面板后更新继续」可观察、可恢复（v0.6 用户需求）。
//
// 为什么需要它：
//   - 之前更新状态（updating/updated/error）存在 SourceEntry 的组件 state 里，
//     面板关闭（portal 卸载）时状态随组件销毁，host 的 pnpm 其实还在后台跑，
//     但用户再打开面板看不到进度/结果；
//   - 这里用模块级单例 + 发布订阅（配合 useSyncExternalStore）保存最后一次
//     更新任务的状态：组件卸载后 store 仍存活，重开面板时恢复渲染。
//
// 只保存「更新任务」状态；「检查更新」结果留在组件本地即可（重开自动重查）。

import type { UpdateResult } from '../contract';

/** 更新 remote 的最小调用面（与 SourceEntry 的 PluginAuditUpdateFace 结构一致，
 *  此处独立声明避免跨模块循环依赖）。 */
export interface UpdateFace {
  update(moduleNames: string[]): Promise<
    | { ok: true; value: UpdateResult }
    | { ok: false; error: { code: string; message: string } }
  >;
}

/** 更新任务状态（模块级单例，不可变快照）。 */
export type UpdateTask =
  | { kind: 'idle' }
  | { kind: 'running'; names: string[] }
  | { kind: 'done'; ok: boolean; names: string[]; result: UpdateResult | null; message: string };

/** 内部可变状态；每次变更整体替换快照，保证 useSyncExternalStore 的引用稳定。 */
let state: UpdateTask = { kind: 'idle' };
const listeners = new Set<() => void>();

/** 当前快照（供 useSyncExternalStore.getSnapshot 使用，必须返回稳定引用）。 */
export function getUpdateTask(): UpdateTask {
  return state;
}

/** 订阅状态变更（供 useSyncExternalStore.subscribe 使用）。 */
export function subscribeUpdateTask(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setState(next: UpdateTask): void {
  state = next;
  for (const listener of [...listeners]) listener();
}

/** 是否有更新任务正在运行（供入口按钮/卡片禁用判断）。 */
export function isUpdating(): boolean {
  return state.kind === 'running';
}

/**
 * 启动一次更新任务（持久化到模块级 store，面板关闭后仍可见）。
 *
 * @param face pluginAudit remote 调用面
 * @param names 要更新的插件包名列表
 * @returns 最终任务状态（done 或 error）
 */
export async function startUpdateTask(
  face: UpdateFace,
  names: string[],
): Promise<UpdateTask> {
  // 已有任务在跑 → 忽略新请求（按钮在 running 时应已 disabled）。
  if (state.kind === 'running') return state;
  setState({ kind: 'running', names });
  try {
    const result = await face.update(names);
    if (!result.ok) {
      const message = result.error.message;
      const next: UpdateTask = { kind: 'done', ok: false, names, result: null, message };
      setState(next);
      return next;
    }
    const next: UpdateTask = { kind: 'done', ok: true, names, result: result.value, message: '' };
    setState(next);
    return next;
  } catch (cause) {
    const next: UpdateTask = {
      kind: 'done',
      ok: false,
      names,
      result: null,
      message: cause instanceof Error ? cause.message : String(cause),
    };
    setState(next);
    return next;
  }
}

/** 清除更新任务状态（回到 idle，重新检查场景用）。 */
export function clearUpdateTask(): void {
  setState({ kind: 'idle' });
}
