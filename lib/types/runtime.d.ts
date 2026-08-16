import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Context } from '@deepseek-ai/cordis';
import type { CheckUpdatesResult, ToggleResult, UpdateResult } from './contract';
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
    /** 当前 profile 目录（更新时 pnpm 的 cwd；从 patchPath 反推）。 */
    profileDir(): string | null;
    /** web.fetch 能力（registry 探测用）。 */
    fetchJson(url: string): Promise<{
        ok: boolean;
        json: unknown;
    }>;
    /** 读已装版本与描述（node_modules/<pkg>/package.json）。 */
    readPackageJson(moduleName: string): Promise<{
        version: string;
        description?: string;
    } | undefined>;
    /** subprocess 能力（pnpm update 用）。 */
    spawnRun(command: string, args: string[], cwd: string): Promise<{
        exitCode: number | null;
        output: string;
        spawnError?: string;
    }>;
}
/**
 * pluginAudit 的开关核心（与 cordis/typert 无关的纯逻辑，可单测）：
 * 校验目标存在、是自装、非本插件自身，然后执行持久化 + 即时生效。
 */
export declare function executeToggle(deps: RuntimeDeps, entryId: string, disabled: boolean): Promise<ToggleResult>;
/**
 * 检查更新（纯只读）：对每个自装插件读已装版本 + 探测 npm registry。
 *
 * @param deps runtime 依赖
 * @returns 更新状态列表；无自装插件时 packages 为空数组
 */
export declare function executeCheckUpdates(deps: RuntimeDeps): Promise<CheckUpdatesResult>;
/**
 * 执行更新：校验目标都是自装插件且非本插件自身，然后 pnpm update。
 *
 * @param deps runtime 依赖
 * @param moduleNames 要更新的插件包名列表
 * @returns 更新结果（退出码 + 截断输出）
 * @throws 有目标不是自装插件、是插件自身、或 profile 目录定位失败时
 */
export declare function executeUpdateRemote(deps: RuntimeDeps, moduleNames: string[]): Promise<UpdateResult>;
/**
 * 读取插件的功能描述（只读）：优先内置中英字典（随系统语言），字典没有的
 * 从 node_modules/<pkg>/package.json 读英文 description 兜底（zh=en）。
 *
 * @param deps runtime 依赖
 * @param moduleNames 要查的模块名列表（可为空 → 返回空 map）
 * @returns moduleName → { zh, en } 双语描述
 */
export declare function executeDescriptions(deps: RuntimeDeps, moduleNames: string[]): Promise<Record<string, {
    zh: string;
    en: string;
}>>;
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
    /**
     * 检查自装插件是否有可用更新（只读）。
     *
     * @returns 每个自装插件的已装/最新版本与 outdated 标记
     */
    checkUpdates(): Promise<CheckUpdatesResult>;
    /**
     * 更新一个或多个自装插件（在 profile 目录跑 pnpm update）。
     *
     * @param moduleNames 目标插件包名（如 `@linxin666/dsh-ssh`、`dshmarket`）
     * @returns pnpm 执行结果
     * @throws 目标含非自装插件 / 本插件自身 / profile 定位失败时
     */
    update(moduleNames: string[]): Promise<UpdateResult>;
    /**
     * 读取插件功能描述（只读）：返回双语 { zh, en }，client 按系统语言选择。
     *
     * @param moduleNames 要查的模块名列表
     * @returns moduleName → { zh, en }
     */
    descriptions(moduleNames: string[]): Promise<Record<string, {
        zh: string;
        en: string;
    }>>;
}
//# sourceMappingURL=runtime.d.ts.map