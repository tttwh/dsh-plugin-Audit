/** package.json 的 repository 既可能是字符串，也可能是 { type, url }。 */
export type RepositoryField = string | {
    type?: unknown;
    url?: unknown;
} | null | undefined;
/** 把 npm 常见的 git URL 形式归一化为 https://github.com/owner/repo。 */
export declare function normalizeGitHubUrl(value: RepositoryField): string | null;
/** repository 优先；缺失时接受确实指向 GitHub 的 homepage。 */
export declare function resolveGitHubUrl(repository: RepositoryField, homepage: unknown): string | null;
//# sourceMappingURL=metadata.d.ts.map