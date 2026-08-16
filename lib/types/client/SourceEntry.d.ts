import type { ReactElement } from 'react';
import type { SourceTabInject } from './SourceTab';
/** sidebar.footer.action 的 owner props（catalog 已核实：只有 wide）。 */
export interface SourceEntryOwnerProps {
    /** 侧边栏是否宽态渲染（false = 56px rail）。 */
    wide: boolean;
}
/** 本入口的完整 props：owner props + SourceTab 的能力 + locale 绑定的 t。 */
export type SourceEntryProps = SourceEntryOwnerProps & SourceTabInject & {
    t: (key: string) => string;
};
/**
 * 侧边栏底部「插件目录」入口。
 *
 * @param props wide=侧边栏宽态；list/toggle=SourceTab 需要的能力（由 apply 注入）；
 *              t=locale 绑定的翻译函数（slot 按注册项的 locale 注入）。
 * @returns 触发按钮 +（打开时）portal 渲染的居中面板。
 */
export declare function SourceEntry({ wide, list, toggle, t }: SourceEntryProps): ReactElement;
//# sourceMappingURL=SourceEntry.d.ts.map