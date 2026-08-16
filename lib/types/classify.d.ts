/** 来源标签。三种取值，UI/CLI 各自映射成中文/英文。 */
export type Origin = 'official' | 'user' | 'builtin';
/** 官方发行版的唯一组织作用域：所有 @deepseek-ai/* 包都来自 dsh 官方 monorepo。 */
export declare const OFFICIAL_SCOPE = "@deepseek-ai/";
/** Loader 内置模块前缀（cordis:include / cordis:group 等基建，不是用户/官方 npm 包）。 */
export declare const BUILTIN_PREFIX = "cordis:";
/** 与 host-plugin-inventory 的 remote 载荷字段对齐（Web 侧拿到的就是这个形状）。 */
export interface PluginInventoryEntry {
    entryId: string;
    moduleName: string;
    enabled: boolean;
    fiberPhase: string | null;
}
/** 分类结果：来源 + 一句判定依据。 */
export interface OriginResult {
    origin: Origin;
    reason: string;
}
/** 一个已分类的条目（在 PluginInventoryEntry 基础上加了来源信息）。 */
export interface ClassifiedEntry extends PluginInventoryEntry {
    origin: Origin;
    reason: string;
    /**
     * 该条目在配置行里的原始 id（`entry.options.id`），不带 loader 树路径前缀
     * （如 `ssh`，而 `entryId` 是 `include:ssh`）。
     *
     * 为什么需要区分这两个 id（v0.4 修复）：
     *   - `entryId`（带前缀）是 Loader 树内的完整路径，`ctx.loader.update()` 用它
     *     resolve 条目；
     *   - 但 profile 的 cordis.patch.yml 是「行级 patch」，按配置行自身的 `id`
     *     字段匹配（官方 patch 方言，见 dsh-app-boot 的 applyEntryPatches），
     *     只认原始 id。v0.2/v0.3 把带前缀的 entryId 写进 patch 文件，启动时被
     *     当作「找不到条目」跳过（每次 boot 打 warning），导致停用重启即失效。
     */
    configId: string;
}
/**
 * 判定一个模块说明符（包名）的来源。
 *
 * 规则（自上而下，命中即返回）：
 *
 *  1. 内置基建：`cordis:` 前缀 → builtin
 *     （loader.entries() 已跳过 group 行，这里兜底处理显式 cordis: 内置行。）
 *
 *  2. 自装覆盖：包名出现在「用户显式安装集」里 → user
 *     该集合来自两个来源的并集：
 *       a) profile 的 package.json `dependencies`（dsh plugin add / pnpm add 落在这里）；
 *       b) 本插件 config.extraUserPackages（用户手工声明的覆盖白名单）。
 *     覆盖原因：处理「用户恰好装了 @deepseek-ai/ 前缀的第三方包」这种边界——
 *     作用域规则会误判成官方，但既然是用户自己 add 的，就应归为自装。
 *     优先级高于作用域规则。
 *
 *  3. 官方作用域：`@deepseek-ai/` 前缀 → official
 *     这是官方发行版（dsh-*、cordis*、cosmokit、schemastery、node-* 等）的唯一
 *     npm 组织作用域。任何官方 bundle 升级新增的插件仍在此作用域内，无需手工维护名单。
 *
 *  4. 其余（无作用域、其他作用域、相对路径 ./、file: 等）→ user
 *     例如 dsh-at-file、dsh-better-sidebar、@liustack/modlens、@omdsh-dev/dsh-genui。
 *
 * @param moduleName 条目的模块说明符（包名），如 '@deepseek-ai/dsh-tool-bash' 或 'dsh-at-file'
 * @param extraUserPackages 用户显式安装/覆盖的包名集合（默认空集）
 */
export declare function classifyOrigin(moduleName: string, extraUserPackages?: ReadonlySet<string>): OriginResult;
/** Loader 条目的最小结构（host 侧从 ctx.loader.entries() 拿到）。 */
export interface LoaderEntryShape {
    id: string;
    options: {
        id?: string;
        name: string;
        group?: boolean | null;
        config?: unknown;
    };
    disabled?: boolean;
    fiber?: {
        state: number;
    } | undefined;
}
/**
 * 将一个 Loader 条目转换为带来源标签的分类条目。
 *
 * @param entry Loader 条目
 * @param extraUserPackages 用户显式安装/覆盖的包名集合
 */
export declare function classifyEntry(entry: LoaderEntryShape, extraUserPackages?: ReadonlySet<string>): ClassifiedEntry;
/** 对一批条目做来源分组。 */
export interface OriginGroups<T> {
    official: T[];
    user: T[];
    builtin: T[];
}
export declare function groupByOrigin<T extends {
    origin: Origin;
}>(entries: T[]): OriginGroups<T>;
//# sourceMappingURL=classify.d.ts.map