import type { ReactElement } from 'react';
import type { SourceTabInject } from './SourceTab';
import type { CheckUpdatesResult, PluginMetadata, UninstallResult, UpdateResult } from '../contract';
/** sidebar.footer.action 的 owner props（catalog 已核实：只有 wide）。 */
export interface SourceEntryOwnerProps {
    /** 侧边栏是否宽态渲染（false = 56px rail）。 */
    wide: boolean;
}
/** pluginAudit remote 的调用面（checkUpdates / update / uninstall 新增于 v0.6）。 */
export interface PluginAuditUpdateFace {
    checkUpdates(): Promise<{
        ok: true;
        value: CheckUpdatesResult;
    } | {
        ok: false;
        error: {
            code: string;
            message: string;
        };
    }>;
    update(moduleNames: string[]): Promise<{
        ok: true;
        value: UpdateResult;
    } | {
        ok: false;
        error: {
            code: string;
            message: string;
        };
    }>;
    descriptions(moduleNames: string[]): Promise<{
        ok: true;
        value: Record<string, PluginMetadata>;
    } | {
        ok: false;
        error: {
            code: string;
            message: string;
        };
    }>;
    uninstall(moduleName: string): Promise<{
        ok: true;
        value: UninstallResult;
    } | {
        ok: false;
        error: {
            code: string;
            message: string;
        };
    }>;
}
/** 本入口的完整 props：owner props + SourceTab 的能力 + locale 绑定的 t。 */
export type SourceEntryProps = SourceEntryOwnerProps & SourceTabInject & {
    t: (key: string) => string;
    /**
     * 更新 remote 调用面（由 apply 注入）。
     *
     * 注意：这是一个 Promise —— inject 工厂里 `ensureMounted()` 返回的是
     * `Promise<face>`（$mount 异步 + reflect.get）。直接在组件里
     * `updates.checkUpdates()` 会报 "checkUpdates is not a function"
     * （v0.6 修复：组件先用 useEffect resolve 出 face 再调用）。
     */
    updates?: Promise<PluginAuditUpdateFace> | null;
    /** 当前 locale id（如 'zh' / 'en'）——描述按系统语言切换用（v0.6）。 */
    getLocale?: () => string;
};
/**
 * 侧边栏底部「插件目录」入口。
 *
 * @param props wide=侧边栏宽态；list/toggle=SourceTab 需要的能力（由 apply 注入）；
 *              updates=更新 remote 调用面；t=locale 绑定的翻译函数。
 * @returns 触发按钮 +（打开时）portal 渲染的居中面板。
 */
export declare function SourceEntry({ wide, list, toggle, t, updates, getLocale, }: SourceEntryProps): ReactElement;
//# sourceMappingURL=SourceEntry.d.ts.map