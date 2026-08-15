import type { OriginResult } from '../classify';
import type { InventorySnapshot } from './SourceTab';
export declare const inject: string[];
/** remote.pluginInventory 的最小结构。 */
interface PluginInventoryRemote {
    list(): Promise<{
        ok: true;
        value: InventorySnapshot;
    } | {
        ok: false;
        error: {
            code: string;
            message: string;
        };
    }>;
}
/** pluginAudit remote 的调用面（$mount 后从 ctx.reflect.get('remote.pluginAudit') 拿）。 */
export interface PluginAuditRemoteFace {
    toggle(entryId: string, disabled: boolean): Promise<{
        ok: true;
        value: {
            entryId: string;
            disabled: boolean;
            message: string;
        };
    } | {
        ok: false;
        error: {
            code: string;
            message: string;
        };
    }>;
}
/** locale 服务的最小结构。 */
interface LocaleService {
    register(namespace: string, dict: Record<string, Record<string, string>>): void;
    bind(namespace: string): (key: string) => string;
}
/** slots 服务的最小结构。 */
interface SlotsService {
    inject(slotName: string, fn: () => void): void;
    register(options: Record<string, unknown>, component: unknown): void;
}
/** remote/reflect 服务的最小结构（$mount 动态挂载 remote）。 */
interface RemoteService {
    $mount(contribution: unknown): Promise<() => void>;
}
interface ReflectService {
    get(name: string): unknown;
}
/** 本 client 插件的最小上下文。 */
export interface ClientContext {
    slots: SlotsService;
    locale: LocaleService;
    remote: {
        pluginInventory: PluginInventoryRemote;
    } & RemoteService;
    reflect?: ReflectService;
}
/**
 * cordis client 插件入口。
 */
export declare function apply(ctx: ClientContext): void;
export type { OriginResult };
//# sourceMappingURL=index.d.ts.map