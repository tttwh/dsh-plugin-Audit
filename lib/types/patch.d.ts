export interface PatchDocument {
    /** 文件开头的注释行（原样保留）。 */
    header: string[];
    /** 注释之后的正文行（含 `[]` 或条目列表）。 */
    body: string[];
}
/** 把文件文本拆成「注释头 + 正文」。 */
export declare function splitPatch(text: string): PatchDocument;
/** 找顶层 `- id: <id>` 的行索引（0 缩进），找不到返回 -1。 */
export declare function findRow(body: string[], entryId: string): number;
/** 某条目行之后的条目区间（到下一个顶层 - id: 或结尾）。 */
export declare function rowRange(body: string[], start: number): {
    start: number;
    end: number;
};
/**
 * 对正文执行一次开关操作（纯函数，不碰文件）。
 *
 * @param body 原正文行
 * @param entryId 目标条目在配置行里的原始 id（不带 loader 路径前缀，如 `ssh`）
 * @param disabled 目标状态
 * @returns 新正文 + 是否发生变化
 */
export declare function applyToggle(body: string[], entryId: string, disabled: boolean): {
    body: string[];
    changed: boolean;
};
/** 序列化回文件文本（保留注释头 + 正文 + 末尾换行）。 */
export declare function serializePatch(doc: PatchDocument, body: string[]): string;
/** 从 loader 的 include 根条目反推 profile 目录里的 cordis.patch.yml 路径。 */
export declare function profilePatchPath(includeConfigPath: string | undefined): string | null;
/**
 * 从 patch 文件路径取得 profile 目录。
 *
 * 不能用 `slice(0, lastIndexOf('/'))`：Windows 的 fileURLToPath 返回反斜杠路径，
 * 找不到 `/` 时会只截掉最后一个字符，导致 pnpm 在错误 cwd 中执行。额外识别
 * Windows 绝对路径，让非 Windows CI 也能覆盖这个回归场景。
 */
export declare function profileDirectory(patchPath: string | null): string | null;
export interface ToggleResult {
    changed: boolean;
    path: string;
    message: string;
}
/**
 * 对 profile 的 cordis.patch.yml 执行一次持久化开关。
 *
 * @param patchPath cordis.patch.yml 的绝对路径
 * @param entryId 目标条目的配置行原始 id（不带 loader 路径前缀，如 `ssh`）
 * @param disabled 目标状态（true=停用，false=启用）
 */
export declare function togglePatchFile(patchPath: string, entryId: string, disabled: boolean): ToggleResult;
//# sourceMappingURL=patch.d.ts.map