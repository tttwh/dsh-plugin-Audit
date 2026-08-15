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
export interface SourceTabProps {
    list: SourceTabInject['list'];
    toggle: SourceTabInject['toggle'];
    t: (key: string) => string;
}
/** 「来源」tab 本体。 */
export declare function SourceTab({ list, toggle, t }: SourceTabProps): ReactElement;
//# sourceMappingURL=SourceTab.d.ts.map