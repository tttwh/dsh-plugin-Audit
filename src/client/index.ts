// @file src/client/index.ts
// @description dsh-plugin-Audit 的 client 半边：在左侧菜单栏底部新增「插件目录」
//              入口（sidebar.footer.action 插槽），点击弹出面板，按官方/自装分组
//              展示插件，自装插件带开关按钮（走 pluginAudit/toggle remote）。
//
// 依据（已核实）：
//   - @deepseek-ai/dsh-client-ui-sidebar 把 `sidebar.footer.action` 声明为
//     根级 list 插槽（设置按钮旁的附加动作），任何插件都能注册一个入口；
//     owner props 只有 { wide }（false = 56px rail），locale 经注册项的 locale
//     字段注入组件 props.t（dsh-remote-web-ui 同款入口模式）。
//   - host 侧 `pluginInventory/list` remote 已挂在客户端装配里
//     （@deepseek-ai/dsh-api-remotes），返回每个条目的 entryId/moduleName/enabled/fiberPhase。
//   - 官方「插件列表」tab(id=all) 是写死的、不做来源分组，所以这里自建入口。
//   - 官方 host-plugin-inventory 只读（不能 enable/disable），开关走自建的
//     pluginAudit remote（见 src/contract.ts + src/runtime.ts）。
//   - v0.5：按用户需求从 设置 → 插件 的「来源」tab 迁移到侧边栏底部入口，
//     设置页不再注册 tab。

import type { OriginResult } from '../classify';
import { PLUGIN_AUDIT_REMOTE } from './remote';
import { SourceEntry } from './SourceEntry';
import type { InventorySnapshot, SourceTabInject } from './SourceTab';
import { adoptStyles } from './styles';

export const inject = ['slots', 'locale', 'remote', 'remote.pluginInventory'];

/** 本 client 插件的字典命名空间。 */
const NS = 'pluginAudit.source';

/** remote.pluginInventory 的最小结构。 */
interface PluginInventoryRemote {
  list(): Promise<
    | { ok: true; value: InventorySnapshot }
    | { ok: false; error: { code: string; message: string } }
  >;
}

/** pluginAudit remote 的调用面（$mount 后从 ctx.reflect.get('remote.pluginAudit') 拿）。 */
export interface PluginAuditRemoteFace {
  toggle(entryId: string, disabled: boolean): Promise<
    | { ok: true; value: { entryId: string; disabled: boolean; message: string } }
    | { ok: false; error: { code: string; message: string } }
  >;
}

/** locale 服务的最小结构。 */
interface LocaleService {
  register(namespace: string, dict: Record<string, Record<string, string>>): void;
  bind(namespace: string): (key: string) => string;
  /** 读当前 locale 快照（描述按系统语言切换用，v0.6）。 */
  getLocale(): { active: string; revision: number };
}

/** slots 服务的最小结构。 */
interface SlotsService {
  inject(slotName: string, fn: () => void): void;
  register(options: Record<string, unknown>, component: unknown): void;
}

/** remote/reflect 服务的最小结构（$mount 动态挂载 remote）。 */
interface RemoteService {
  $mount(contribution: unknown): Promise<() => void>;
}
interface ReflectService {
  get(name: string): unknown;
}

/** 本 client 插件的最小上下文。 */
export interface ClientContext {
  slots: SlotsService;
  locale: LocaleService;
  remote: { pluginInventory: PluginInventoryRemote } & RemoteService;
  reflect?: ReflectService;
}

/**
 * cordis client 插件入口。
 */
export function apply(ctx: ClientContext): void {
  adoptStyles();

  // 惰性挂载 pluginAudit remote：第一次点击开关时才 $mount（幂等，复用一个 promise）。
  // 用 ctx.reflect.get 拿调用面（dotted ctx.remote.pluginAudit 会停在 fiber 链上，见
  // dsh-at-file 注释）。
  let mounted: Promise<PluginAuditRemoteFace> | null = null;
  const ensureMounted = (): Promise<PluginAuditRemoteFace> => {
    if (mounted === null) {
      if (ctx.reflect === undefined) {
        mounted = Promise.reject(new Error('reflect 服务不可用，无法挂载 pluginAudit remote'));
      } else {
        mounted = ctx.remote
          .$mount(PLUGIN_AUDIT_REMOTE)
          .then(() => ctx.reflect!.get('remote.pluginAudit') as PluginAuditRemoteFace);
      }
    }
    return mounted;
  };

  ctx.slots.inject(
    'sidebar.footer.action',
    () => {
      ctx.locale.register(NS, {
        zh: {
          entry: '插件目录',
          close: '关闭',
          search: '搜索插件',
          official: '官方',
          user: '自装',
          enabled: '已启用',
          disabled: '已停用',
          toggleOn: '启用',
          toggleOff: '停用',
          toggling: '切换中…',
          toggleError: '操作失败',
          loading: '正在读取插件…',
          error: '暂时无法读取插件。',
          retry: '重试',
          empty: '暂无插件。',
          update: '更新',
          checking: '检查中…',
          updating: '更新中…',
          updateHint: '正在执行 pnpm update，可能需要几分钟。',
          updateError: '更新失败',
          updated: '已更新',
          updatedDetail: '已更新插件',
          updateFailed: '更新失败',
          recheck: '重新检查',
          outdated: '可更新',
          updateAll: '全部更新',
          upToDate: '所有自装插件均为最新版本。',
          upToDateShort: '已是最新',
          registryUnreachable: 'registry 不可达',
          registryUnreachableDetail: '无法连接 npm registry，请检查网络后重试。',
          uninstall: '卸载',
          uninstalling: '卸载中…',
          uninstallConfirm: '确定要卸载插件 {name} 吗？此操作会从 profile 中移除它。',
        },
        en: {
          entry: 'Plugin Catalog',
          close: 'Close',
          search: 'Search plugins',
          official: 'Official',
          user: 'Self-installed',
          enabled: 'Enabled',
          disabled: 'Disabled',
          toggleOn: 'Enable',
          toggleOff: 'Disable',
          toggling: 'Toggling…',
          toggleError: 'Toggle failed',
          loading: 'Reading plugins…',
          error: 'Plugins are temporarily unavailable.',
          retry: 'Retry',
          empty: 'No plugins are available.',
          update: 'Update',
          checking: 'Checking…',
          updating: 'Updating…',
          updateHint: 'Running pnpm update; this may take a few minutes.',
          updateError: 'Update failed',
          updated: 'Updated',
          updatedDetail: 'Updated plugins',
          updateFailed: 'Update failed',
          recheck: 'Recheck',
          outdated: 'updates',
          updateAll: 'Update all',
          upToDate: 'All self-installed plugins are up to date.',
          upToDateShort: 'Up to date',
          registryUnreachable: 'registry unreachable',
          registryUnreachableDetail: 'Cannot reach the npm registry; check your network and retry.',
          uninstall: 'Uninstall',
          uninstalling: 'Uninstalling…',
          uninstallConfirm: 'Uninstall plugin {name}? This removes it from the profile.',
        },
      });

      const t = ctx.locale.bind(NS);
      const list = async (): Promise<InventorySnapshot> => {
        const result = await ctx.remote.pluginInventory.list();
        if (!result.ok) {
          throw new Error(`pluginInventory.list failed: ${result.error.code}: ${result.error.message}`);
        }
        return result.value;
      };
      const toggle = async (entryId: string, disabled: boolean): Promise<string> => {
        const face = await ensureMounted();
        const result = await face.toggle(entryId, disabled);
        if (!result.ok) {
          throw new Error(`pluginAudit.toggle failed: ${result.error.code}: ${result.error.message}`);
        }
        return result.value.message;
      };

      const injected: SourceTabInject = { list, toggle };
      // 侧边栏底部入口：locale 注入 t、owner 注入 wide、inject 注入
      // list/toggle + updates 调用面，合并进 SourceEntry 的 props
      // （与 settings.plugins.tab 时代一致；updates 为 v0.6 新增）。
      ctx.slots.register(
        {
          name: 'sidebar.footer.action',
          id: 'plugin-catalog', // 与 remote-web-ui / cordis-panel 并列的自有入口
          order: 30,
          locale: NS,
          label: () => t('entry'),
          inject: () => ({ ...injected, updates: ensureMounted(), getLocale: () => ctx.locale.getLocale().active }),
        },
        SourceEntry,
      );
    },
  );
}

// 把 classifyOrigin 的返回类型也一并导出，方便 SourceTab 复用同一份判定。
export type { OriginResult };
