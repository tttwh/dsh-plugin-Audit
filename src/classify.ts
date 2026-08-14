// @file src/classify.ts
// @description 来源判定核心：把「一个 Loader 条目」归类为 官方 / 自装 / 内置。
//
// 设计要点（教学向）：
//  1. 本模块是「纯函数、零副作用、零运行时依赖」，可脱离 dsh 单独做单元测试，
//     也被 host（/plugin-audit 命令）与 client（设置页「来源」tab）共用。
//  2. 判定的唯一权威信号是「条目的模块说明符」（即插件包的 npm 包名），
//     它在 host 侧是 `entry.options.name`，在 Web 侧是 `pluginInventory.list()` 返回的
//     `moduleName`。官方 host-plugin-inventory 明确不暴露「由哪个 bundle/profile 引入」，
//     所以来源判定只能从包名这一信号推导。
//  3. 规则按优先级排列，见 classifyOrigin 函数内的注释。

/** 来源标签。三种取值，UI/CLI 各自映射成中文/英文。 */
export type Origin = 'official' | 'user' | 'builtin';

/** 官方发行版的唯一组织作用域：所有 @deepseek-ai/* 包都来自 dsh 官方 monorepo。 */
export const OFFICIAL_SCOPE = '@deepseek-ai/';

/** Loader 内置模块前缀（cordis:include / cordis:group 等基建，不是用户/官方 npm 包）。 */
export const BUILTIN_PREFIX = 'cordis:';

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
export function classifyOrigin(
  moduleName: string,
  extraUserPackages: ReadonlySet<string> = new Set(),
): OriginResult {
  if (moduleName.startsWith(BUILTIN_PREFIX)) {
    return { origin: 'builtin', reason: 'cordis: 内置基建模块' };
  }
  // 覆盖优先于作用域：用户显式安装/声明的包，即使带官方前缀也算自装。
  if (extraUserPackages.has(moduleName)) {
    return { origin: 'user', reason: '在 profile dependencies / extraUserPackages 中显式安装' };
  }
  if (moduleName.startsWith(OFFICIAL_SCOPE)) {
    return { origin: 'official', reason: '@deepseek-ai/ 官方发行作用域' };
  }
  return { origin: 'user', reason: '非 @deepseek-ai/ 作用域（自装）' };
}

/** Loader 条目的最小结构（host 侧从 ctx.loader.entries() 拿到）。 */
export interface LoaderEntryShape {
  id: string;
  options: { name: string; group?: boolean | null };
  disabled?: boolean;
  fiber?: { state: number } | undefined;
}

/**
 * 将一个 Loader 条目转换为带来源标签的分类条目。
 *
 * @param entry Loader 条目
 * @param extraUserPackages 用户显式安装/覆盖的包名集合
 */
export function classifyEntry(
  entry: LoaderEntryShape,
  extraUserPackages: ReadonlySet<string> = new Set(),
): ClassifiedEntry {
  const { origin, reason } = classifyOrigin(entry.options.name, extraUserPackages);
  return {
    entryId: entry.id,
    moduleName: entry.options.name,
    origin,
    reason,
    // 与 host-plugin-inventory 的投影一致：enabled = 未 disabled
    enabled: !entry.disabled,
    // 简化的 fiber 阶段；CLI 场景下不一定有 fiber，稳妥地给 null
    fiberPhase: entry.fiber ? String(entry.fiber.state) : null,
  };
}

/** 对一批条目做来源分组。 */
export interface OriginGroups<T> {
  official: T[];
  user: T[];
  builtin: T[];
}

export function groupByOrigin<T extends { origin: Origin }>(entries: T[]): OriginGroups<T> {
  const official: T[] = [];
  const user: T[] = [];
  const builtin: T[] = [];
  for (const entry of entries) {
    if (entry.origin === 'official') official.push(entry);
    else if (entry.origin === 'builtin') builtin.push(entry);
    else user.push(entry);
  }
  return { official, user, builtin };
}
