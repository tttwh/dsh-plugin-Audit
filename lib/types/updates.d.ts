import type { UpdateStatus } from './contract';
/** 版本比较：a > b 返回正数，a === b 返回 0，a < b 返回负数。 */
export declare function compareVersions(a: string, b: string): number;
/** web.fetch 服务的最小 seam（仅 URL → JSON）。 */
export interface FetchSeam {
    fetchJson(url: string): Promise<{
        ok: boolean;
        json: unknown;
    }>;
}
/** fs 读取 seam：读 package.json 返回对象，失败返回 undefined。 */
export interface ReadManifestSeam {
    readPackageJson(moduleName: string): Promise<{
        version: string;
    } | undefined>;
}
/** subprocess seam：在 cwd 跑一条命令，收集输出，返回退出码（null=异常终止）。 */
export interface SpawnSeam {
    run(command: string, args: string[], cwd: string): Promise<{
        exitCode: number | null;
        output: string;
        spawnError?: string;
    }>;
}
/** updates 逻辑的全部依赖（供 executeCheckUpdates / executeUpdate 使用）。 */
export interface UpdatesDeps {
    /** 当前 profile 目录（pnpm 执行与 node_modules 解析的基准）。 */
    profileDir: string;
    /** 需要检查/更新的模块名列表（已按来源过滤的自装插件）。 */
    moduleNames: string[];
    fetch: FetchSeam;
    read: ReadManifestSeam;
    spawn: SpawnSeam;
    /** 执行更新的超时（毫秒，默认 10 分钟，与 remote-web-ui 一致）。 */
    timeoutMs?: number;
    /** registry 探测并发数；默认 6，避免串行等待，也避免一次压满连接池。 */
    checkConcurrency?: number;
    /** profile/package.json 中的依赖声明，用于识别桌面托管与本地链接。 */
    dependencySpec?: (moduleName: string) => string | undefined;
}
export type InstallSource = 'registry' | 'desktop' | 'local';
/** 只有 registry 依赖能由 pnpm add @latest 独立更新。 */
export declare function classifyInstallSource(spec: string | undefined): InstallSource;
/** npm registry 的 latest 元数据 URL（作用域包名需 URL 编码 `/`）。 */
export declare function registryLatestUrl(moduleName: string): string;
/**
 * 检查更新：限流并发读取已装版本、探测 registry、semver 比较。
 * 纯只读；单个包探测失败不中断整体，全部失败时标记 registryUnreachable。
 *
 * 不能串行：插件较多时，总耗时会变成每个 registry RTT 的总和；也不能直接
 * Promise.all 无上限并发，否则大型 profile 会瞬间占满 host 的网络连接池。
 * worker 池兼顾响应速度与资源占用，并按输入下标写回以保持 Loader 顺序。
 */
export declare function executeCheckUpdates(deps: UpdatesDeps): Promise<{
    packages: UpdateStatus[];
    registryUnreachable: boolean;
}>;
/**
 * 执行更新：在 profile 目录跑 pnpm update（corepack/npx 兜底）。
 * 返回退出码与截断输出；命令不存在时依次尝试下一个候选。
 */
export declare function executeUpdate(deps: UpdatesDeps): Promise<{
    ok: boolean;
    exitCode: number | null;
    output: string;
    error: string | null;
}>;
//# sourceMappingURL=updates.d.ts.map