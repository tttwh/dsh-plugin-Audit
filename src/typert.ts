// @file src/typert.ts
// @description host 侧 Typert manifest：向网关声明 pluginAudit 端点。
//              通过 ctx.typert.register 注册（与 dsh-at-file 同款手写路径）。

import type { TypertContribution } from '@deepseek-ai/dsh-typert-registry/types';
import { PLUGIN_AUDIT_INVOCATIONS } from './contract';

/** pluginAudit 命名空间的 host manifest。 */
export const TYPERT_MANIFEST: TypertContribution = {
  package: 'dsh-plugin-diraud',
  face: 'host',
  schemas: [],
  model: {
    services: [
      {
        key: 'pluginAudit',
        exportName: 'PluginAuditRuntime',
        description:
          'Toggle self-installed plugins (persisted to the profile cordis.patch.yml); check for and run updates of self-installed plugins.',
        tags: [],
        members: [
          {
            kind: 'method',
            name: 'toggle',
            signature: 'toggle(entryId: string, disabled: boolean): Promise<ToggleResult>',
          },
          {
            kind: 'method',
            name: 'checkUpdates',
            signature: 'checkUpdates(): Promise<CheckUpdatesResult>',
          },
          {
            kind: 'method',
            name: 'update',
            signature: 'update(moduleNames: string[]): Promise<UpdateResult>',
          },
          {
            kind: 'method',
            name: 'descriptions',
            signature: 'descriptions(moduleNames: string[]): Promise<Record<string, { zh: string; en: string }>>',
          },
          {
            kind: 'method',
            name: 'uninstall',
            signature: 'uninstall(moduleName: string): Promise<UninstallResult>',
          },
        ],
        types: [],
      },
    ],
    events: [],
    objects: [],
  },
  invocations: PLUGIN_AUDIT_INVOCATIONS,
};
