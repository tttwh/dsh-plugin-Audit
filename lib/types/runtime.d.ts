import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Context } from '@deepseek-ai/cordis';
import type { ToggleResult } from './contract';
import type { ClassifiedEntry } from './classify';
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
export declare function executeToggle(deps: RuntimeDeps, entryId: string, disabled: boolean): Promise<ToggleResult>;
/**
 * pluginAudit 命名空间的 host 实现，注册在 `pluginAudit` 服务键下。
 */
export declare class PluginAuditRuntime extends TypertRemoteService {
    private readonly deps;
    constructor(ctx: Context, deps: RuntimeDeps);
    /**
     * 停用/启用一个自装插件。
     *
     * @param entryId Loader 条目 id
     * @param disabled true=停用，false=启用
     * @returns 操作结果（成功后 entryId/disabled/message）
     * @throws 目标不是自装插件、是插件自身、或 patch 文件定位失败时
     */
    toggle(entryId: string, disabled: boolean): Promise<ToggleResult>;
}
//# sourceMappingURL=runtime.d.ts.map