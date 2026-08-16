import type { UpdateResult } from '../contract';
/** 更新 remote 的最小调用面（与 SourceEntry 的 PluginAuditUpdateFace 结构一致，
 *  此处独立声明避免跨模块循环依赖）。 */
export interface UpdateFace {
    update(moduleNames: string[]): Promise<{
        ok: true;
        value: UpdateResult;
    } | {
        ok: false;
        error: {
            code: string;
            message: string;
        };
    }>;
}
/** 更新任务状态（模块级单例，不可变快照）。 */
export type UpdateTask = {
    kind: 'idle';
} | {
    kind: 'running';
    names: string[];
} | {
    kind: 'done';
    ok: boolean;
    names: string[];
    result: UpdateResult | null;
    message: string;
};
/** 当前快照（供 useSyncExternalStore.getSnapshot 使用，必须返回稳定引用）。 */
export declare function getUpdateTask(): UpdateTask;
/** 订阅状态变更（供 useSyncExternalStore.subscribe 使用）。 */
export declare function subscribeUpdateTask(listener: () => void): () => void;
/** 是否有更新任务正在运行（供入口按钮/卡片禁用判断）。 */
export declare function isUpdating(): boolean;
/**
 * 启动一次更新任务（持久化到模块级 store，面板关闭后仍可见）。
 *
 * @param face pluginAudit remote 调用面
 * @param names 要更新的插件包名列表
 * @returns 最终任务状态（done 或 error）
 */
export declare function startUpdateTask(face: UpdateFace, names: string[]): Promise<UpdateTask>;
/** 清除更新任务状态（回到 idle，重新检查场景用）。 */
export declare function clearUpdateTask(): void;
//# sourceMappingURL=updateStore.d.ts.map