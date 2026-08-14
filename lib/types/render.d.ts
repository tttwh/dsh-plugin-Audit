import type { ClassifiedEntry, OriginGroups } from './classify';
export interface RenderOptions {
    /** 是否在每行追加判定依据（教学演示用） */
    withReason?: boolean;
    /** 是否逐行列出官方插件（官方通常上百个，默认只给计数） */
    listOfficial?: boolean;
    /** 是否逐行列出内置模块 */
    listBuiltin?: boolean;
}
/**
 * 渲染完整的分组列表。
 */
export declare function renderGroups(groups: OriginGroups<ClassifiedEntry>, opts?: RenderOptions): string;
//# sourceMappingURL=render.d.ts.map