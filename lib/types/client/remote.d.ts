import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import type { CheckUpdatesResult, ToggleResult, UninstallResult, UpdateResult } from '../contract';
import type { LocalizedDescription } from '../contract';
/** pluginAudit 命名空间的 client 贡献。 */
export declare const PLUGIN_AUDIT_REMOTE: TypertRemoteContribution;
declare module '@deepseek-ai/dsh-typert-protocol' {
    /** 运行时访问走 `ctx.reflect.get('remote.pluginAudit')`（dotted 读会停在 fiber 链）。 */
    interface TypertRemoteNamespaceMap {
        pluginAudit: {
            toggle(entryId: string, disabled: boolean): Promise<RemoteResult<ToggleResult>>;
            checkUpdates(): Promise<RemoteResult<CheckUpdatesResult>>;
            update(moduleNames: string[]): Promise<RemoteResult<UpdateResult>>;
            descriptions(moduleNames: string[]): Promise<RemoteResult<Record<string, LocalizedDescription>>>;
            uninstall(moduleName: string): Promise<RemoteResult<UninstallResult>>;
        };
    }
}
//# sourceMappingURL=remote.d.ts.map