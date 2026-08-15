import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import type { ToggleResult } from '../contract';
/** pluginAudit 命名空间的 client 贡献。 */
export declare const PLUGIN_AUDIT_REMOTE: TypertRemoteContribution;
declare module '@deepseek-ai/dsh-typert-protocol' {
    /** 运行时访问走 `ctx.reflect.get('remote.pluginAudit')`（dotted 读会停在 fiber 链）。 */
    interface TypertRemoteNamespaceMap {
        pluginAudit: {
            toggle(entryId: string, disabled: boolean): Promise<RemoteResult<ToggleResult>>;
        };
    }
}
//# sourceMappingURL=remote.d.ts.map