import type { ReactElement } from 'react';
import type { PluginInventoryEntry } from '../classify';
/** pluginInventory/list 的 remote 载荷。 */
export interface InventorySnapshot {
    entries: PluginInventoryEntry[];
}
/** 设置页注入给「来源」tab 的两个能力：读列表 + 开关。 */
export interface SourceTabInject {
    list: () => Promise<InventorySnapshot>;
    toggle: (entryId: string, disabled: boolean) => Promise<string>;
}
/** 一个自装插件的更新状态（与 contract 的 UpdateStatus 对齐，避免跨包耦合）。 */
export interface ClientUpdateStatus {
    moduleName: string;
    currentVersion: string;
    latestVersion: string | null;
    outdated: boolean;
    error: string | null;
    installSource: 'registry' | 'desktop' | 'local';
}
/** 卡片展示用的本地插件元数据。 */
export interface ClientPluginMetadata {
    description: string;
    version: string;
    githubUrl: string | null;
}
export interface SourceTabProps {
    list: SourceTabInject['list'];
    toggle: SourceTabInject['toggle'];
    t: (key: string) => string;
    /** 按模块名索引的更新状态（来自面板顶部的 checkUpdates）；缺失时不显示更新区。 */
    updates?: Record<string, ClientUpdateStatus> | null;
    /** 点击某插件「更新」按钮的回调（由面板持有 remote 调用面并执行）。 */
    onUpdate?: (moduleName: string) => void;
    /** 正在更新的模块名数组（按钮置灰 + 卡片进度条）。 */
    updating?: string[] | null;
    /** 点击某插件「卸载」按钮的回调（由面板持有 remote 调用面并执行）。 */
    onUninstall?: (moduleName: string) => void;
    /** 正在卸载的模块名（按钮置灰）。 */
    uninstalling?: string | null;
    /** moduleName → 描述、已安装版本与 GitHub 仓库。 */
    pluginMetadata?: Record<string, ClientPluginMetadata> | null;
}
/** 「来源」tab 本体。 */
export declare function SourceTab({ list, toggle, t, updates, onUpdate, updating, onUninstall, uninstalling, pluginMetadata, }: SourceTabProps): ReactElement;
//# sourceMappingURL=SourceTab.d.ts.map