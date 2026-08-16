import type { ClassifiedEntry } from './classify';
/** 执行开关所需的最小 loader 面。 */
export interface ToggleLoader {
    update(id: string, options: {
        disabled?: boolean;
    }): Promise<void>;
}
/** 匹配一个自装插件（包名或 entry id 包含关键词）。 */
export declare function matchUserPlugin(classified: ClassifiedEntry[], query: string): ClassifiedEntry[];
/**
 * 执行开关（持久化 + 即时生效）。
 *
 * @param loader loader 服务（ctx.loader）
 * @param entryId 目标条目在 Loader 树里的完整 id（含路径前缀，如 `include:ssh`），
 *                传给 loader.update 做运行时 resolve
 * @param patchId 目标条目在配置行里的原始 id（如 `ssh`），
 *                写进 cordis.patch.yml 的 `- id:` 行——patch 层按行自身的 id
 *                字段匹配，带前缀的完整 id 启动时匹配不到（v0.4 修复）
 * @param disabled 目标状态
 * @param patchPath profile 的 cordis.patch.yml 绝对路径
 * @returns 成功消息
 */
export declare function performToggle(loader: ToggleLoader, entryId: string, patchId: string, disabled: boolean, patchPath: string): Promise<string>;
//# sourceMappingURL=toggle.d.ts.map