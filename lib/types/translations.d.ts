/** 一个包的中英描述。 */
export interface LocalizedText {
    zh: string;
    en: string;
}
/** 内置字典：moduleName → 中英描述。key 与 npm 包名精确匹配。 */
export declare const DESCRIPTION_DICT: Record<string, LocalizedText>;
/**
 * 取一个包的双语描述：先查内置字典，查不到则用英文原文兜底（zh=en）。
 *
 * @param moduleName 模块名
 * @param fallbackEn package.json 读到的英文 description（可为空）
 * @returns { zh, en }
 */
export declare function localizeDescription(moduleName: string, fallbackEn: string): LocalizedText;
//# sourceMappingURL=translations.d.ts.map