// @file src/client/remote.ts
// @description pluginAudit remote 的 client 贡献：把 host 的 pluginAudit/toggle
//              挂到 ctx.remote.pluginAudit（dsh-at-file 同款手写贡献）。
//              descriptors 与 host 共享同一份 src/contract.ts，保证一条 wire 定义。

import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import { PLUGIN_AUDIT_INVOCATIONS } from '../contract';
import type { ToggleResult } from '../contract';

/** pluginAudit 命名空间的 client 贡献。 */
export const PLUGIN_AUDIT_REMOTE: TypertRemoteContribution = {
  package: 'dsh-plugin-Audit',
  descriptors: PLUGIN_AUDIT_INVOCATIONS,
};

declare module '@deepseek-ai/dsh-typert-protocol' {
  /** 运行时访问走 `ctx.reflect.get('remote.pluginAudit')`（dotted 读会停在 fiber 链）。 */
  interface TypertRemoteNamespaceMap {
    pluginAudit: {
      toggle(entryId: string, disabled: boolean): Promise<RemoteResult<ToggleResult>>;
    };
  }
}
