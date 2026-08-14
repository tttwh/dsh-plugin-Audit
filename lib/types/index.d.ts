import type { LoaderEntryShape } from './classify';
export declare const name = "plugin-audit";
export declare const inject: string[];
/** Loader 服务的最小结构：只需要 entries()。 */
interface LoaderService {
    entries(): Iterable<LoaderEntryShape>;
}
/** commands 服务的最小结构：只需要 register()。 */
interface CommandsService {
    register(def: CommandDefinition): () => void;
}
interface CommandDefinition {
    name: string;
    description: string;
    input?: {
        hint?: string;
    };
    handler: (invocation: {
        rawInput: string;
    }) => CommandResult;
}
type CommandResult = {
    kind: 'success' | 'error';
    text: string;
};
/** 本插件的最小上下文（只声明它用到的两个服务）。 */
export interface PluginContext {
    loader: LoaderService;
    commands: CommandsService;
}
/** 本插件的配置（见 cordis.patch.yml 里的 config）。 */
export interface OriginConfig {
    /** 显式的「来源覆盖」白名单：把这些包名强制判定为「自装」。默认空数组。 */
    extraUserPackages?: string[];
}
/**
 * cordis 插件的入口。
 *
 * @param ctx cordis 上下文（注入 loader 与 commands 服务）
 * @param config 本插件的配置（见 cordis.patch.yml）
 */
export declare function apply(ctx: PluginContext, config?: OriginConfig): void;
export {};
//# sourceMappingURL=index.d.ts.map