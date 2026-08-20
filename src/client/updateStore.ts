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
/** 当前更新周期：新点击会进入 pending，复用同一个 drain Promise。 */
let activePromise: Promise<UpdateTask> | null = null;
const pending = new Set<string>();
const cycleNames = new Set<string>();

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
  for (const name of names) {
    if (name.length === 0 || cycleNames.has(name)) continue;
    cycleNames.add(name);
    pending.add(name);
  }

  // 已有 pnpm 在跑：新目标加入下一批并立即发布状态，不再静默吞掉点击。
  if (activePromise !== null) {
    setState({ kind: 'running', names: [...cycleNames] });
    return activePromise;
  }

  activePromise = (async (): Promise<UpdateTask> => {
    let lastResult: UpdateResult | null = null;
    let failure = '';
    try {
      // 点击可能发生在 await face.update 期间；每轮取走当时 pending 的全部目标，
      // 所以并发点击会合并成下一批，但绝不会并发启动两个 pnpm。
      while (pending.size > 0) {
        const batch = [...pending];
        pending.clear();
        setState({ kind: 'running', names: [...cycleNames] });
        try {
          const result = await face.update(batch);
          if (!result.ok) {
            failure ||= result.error.message;
          } else {
            lastResult = result.value;
            if (!result.value.ok) failure ||= result.value.error ?? '更新失败';
          }
        } catch (cause) {
          failure ||= cause instanceof Error ? cause.message : String(cause);
        }
      }

      const completedNames = [...cycleNames];
      const next: UpdateTask = {
        kind: 'done',
        ok: failure.length === 0,
        names: completedNames,
        result: lastResult,
        message: failure,
      };
      setState(next);
      return next;
    } finally {
      activePromise = null;
      pending.clear();
      cycleNames.clear();
    }
  })();
  return activePromise;
}

/** 清除更新任务状态（回到 idle，重新检查场景用）。 */
export function clearUpdateTask(): void {
  setState({ kind: 'idle' });
}
