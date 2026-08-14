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
/** 本 client 插件的最小上下文。 */
export interface ClientContext {
    slots: SlotsService;
    locale: LocaleService;
    remote: {
        pluginInventory: PluginInventoryRemote;
    };
}
/** 在浏览器里暴露给「来源」tab 的注入面：一个懒加载 list()。 */
export interface SourceTabInject {
    list: () => Promise<InventorySnapshot>;
}
/**
 * cordis client 插件入口。
 */
export declare function apply(ctx: ClientContext): void;
export type { OriginResult };
//# sourceMappingURL=index.d.ts.map