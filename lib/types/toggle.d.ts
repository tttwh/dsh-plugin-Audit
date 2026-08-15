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
 * @param entryId 目标条目 id
 * @param disabled 目标状态
 * @param patchPath profile 的 cordis.patch.yml 绝对路径
 * @returns 成功消息
 */
export declare function performToggle(loader: ToggleLoader, entryId: string, disabled: boolean, patchPath: string): Promise<string>;
//# sourceMappingURL=toggle.d.ts.map