// @file src/client/index.ts
// @description dsh-plugin-audit 的 client 半边：在 Web 设置 → 插件里新增一个
//              「来源」tab（settings.plugins.tab 插槽），按官方/自装分组展示插件，
//              自装插件带开关按钮（走 pluginAudit/toggle remote）。
//
// 依据（已核实）：
//   - @deepseek-ai/dsh-client-ui-settings-plugins 把 `settings.plugins.tab` 声明为
//     根级 list 插槽，任何插件都能注册新 tab（不同 id 并列）。
//   - host 侧 `pluginInventory/list` remote 已挂在客户端装配里
//     （@deepseek-ai/dsh-api-remotes），返回每个条目的 entryId/moduleName/enabled/fiberPhase。
//   - 官方「插件列表」tab(id=all) 是写死的、不做来源分组，所以这里新开一个 tab。
//   - 官方 host-plugin-inventory 只读（不能 enable/disable），开关走自建的
//     pluginAudit remote（见 src/contract.ts + src/runtime.ts）。

import type { OriginResult } from '../classify';
import { PLUGIN_AUDIT_REMOTE } from './remote';
import { SourceTab } from './SourceTab';
import type { InventorySnapshot, SourceTabInject } from './SourceTab';
import { adoptStyles } from './styles';

export const inject = ['slots', 'locale', 'remote', 'remote.pluginInventory'];

/** 本 client 插件的字典命名空间。 */
const NS = 'settings.pluginAudit';

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
    'settings.plugins.tab',
    () => {
      ctx.locale.register(NS, {
        zh: {
          tab: '来源',
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
        },
        en: {
          tab: 'Origin',
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
      ctx.slots.register(
        {
          name: 'settings.plugins.tab',
          id: 'source', // 与官方 "all" / "configurable" 并列的新 tab
          order: 20,
          label: () => t('tab'),
          locale: NS,
          inject: () => injected,
        },
        SourceTab,
      );
    },
  );
}

// 把 classifyOrigin 的返回类型也一并导出，方便 SourceTab 复用同一份判定。
export type { OriginResult };
