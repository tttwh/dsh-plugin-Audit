import type { ReactElement } from 'react';
import type { PluginInventoryEntry } from '../classify';
/** pluginInventory/list 的 remote 载荷。 */
export interface InventorySnapshot {
    entries: PluginInventoryEntry[];
}
export interface SourceTabProps {
    list: () => Promise<InventorySnapshot>;
    t: (key: string) => string;
}
/** 「来源」tab 本体。 */
export declare function SourceTab({ list, t }: SourceTabProps): ReactElement;
//# sourceMappingURL=SourceTab.d.ts.map