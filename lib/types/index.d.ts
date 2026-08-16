import type { LoaderEntryShape } from './classify';
export declare const name = "plugin-audit";
export declare const inject: string[];
/** Loader 服务的最小结构：只需要 entries() 与 update()。 */
interface LoaderService {
    entries(): Iterable<LoaderEntryShape>;
    /** 运行时更新条目（disabled 会立即停用/启用 fiber）。 */
    update(id: string, options: {
        disabled?: boolean;
    }): Promise<void>;
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
    }) => CommandResult | Promise<CommandResult>;
}
type CommandResult = {
    kind: 'success' | 'error';
    text: string;
};
/** typert 注册表服务的最小结构（remote 通道注册用）。 */
interface TypertService {
    register(manifest: unknown): () => void;
}
/** subprocess 服务的最小结构（pnpm update 用 spawn；字段与 dsh-subprocess 契约对齐）。 */
interface SubprocessService {
    spawn(spec: {
        argv: readonly string[];
        cwd: string;
        stdio: {
            stdin: 'ignore' | 'pipe' | {
                readonly data: string;
            };
            stdout: 'pipe' | 'inherit' | {
                maxBytes: number;
            };
            stderr: 'pipe' | 'inherit' | {
                maxBytes: number;
            };
        };
        graceMs: number;
        signal?: AbortSignal;
        env?: Record<string, string>;
    }): {
        pid: number;
        collected: {
            stdout?: {
                readFrom(fromByte: number): {
                    text: string;
                    nextOffset: number;
                };
            };
            stderr?: {
                readFrom(fromByte: number): {
                    text: string;
                    nextOffset: number;
                };
            };
        };
        done: Promise<{
            exitCode: number | null;
            signal: string | null;
        }>;
        terminate(): void;
    };
}
/** 本插件的最小上下文（只声明它用到的服务）。 */
export interface PluginContext {
    loader: LoaderService;
    commands: CommandsService;
    typert?: TypertService;
    subprocess?: SubprocessService;
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