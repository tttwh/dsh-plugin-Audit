// @file src/client/SourceTab.tsx
// @description 「来源」tab 的 React 组件：按 官方/自装 分组展示插件，可搜索过滤，
//              自装插件带「启用/停用」开关按钮（走 pluginAudit/toggle remote）。
//
// 说明：client 侧只能拿到 remote.pluginInventory.list() 返回的 moduleName 信号，
// 读不到 profile 的 dependencies，所以这里用「作用域前缀」规则（extraUserPackages 为空），
// 与 host 侧 /plugin-audit 命令共用同一个 classifyOrigin 纯函数，判定口径一致。

import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { classifyOrigin } from '../classify';
import type { Origin, PluginInventoryEntry } from '../classify';

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
  /** moduleName → 功能描述（来自 host 读 package.json）；缺失时不显示描述行。 */
  descriptions?: Record<string, string> | null;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; entries: PluginInventoryEntry[] };

/** 一个已分类条目（沿用 classify 的字段 + 来源）。 */
interface Row extends PluginInventoryEntry {
  origin: Origin;
}

/** 把快照里的条目按来源分类。 */
function classify(entries: PluginInventoryEntry[]): Row[] {
  return entries.map((entry) => ({
    ...entry,
    ...classifyOrigin(entry.moduleName, new Set()),
  }));
}

/** 简短的模块名（去掉作用域与常见前缀，用于卡片标题）。 */
function shortName(moduleName: string): string {
  if (moduleName.startsWith('@')) moduleName = moduleName.slice(moduleName.indexOf('/') + 1);
  return moduleName.replace(/^cordis-plugin-/, '').replace(/^dsh-(?:host-|client-)?/, '');
}

function RowCard({
  row,
  toggle,
  t,
  updateStatus,
  onUpdate,
  updating,
  description,
}: {
  row: Row;
  toggle: SourceTabInject['toggle'];
  t: (k: string) => string;
  updateStatus?: ClientUpdateStatus | null;
  onUpdate?: (moduleName: string) => void;
  /** 正在更新的模块名数组（来自模块级 store 的 running 任务；多包更新也能逐卡匹配）。 */
  updating?: string[] | null;
  description?: string;
}): ReactElement {
  const source =
    row.origin === 'official' ? t('official') : row.origin === 'user' ? t('user') : 'builtin';
  // 该卡片是否正在更新（按模块名匹配，多包更新时各自显示进度条）。
  const isUpdating = updating !== null && updating !== undefined && updating.includes(row.moduleName);
  // 开关状态本地持有：切换成功后即时翻转，避免每次重新拉全量列表。
  const [enabled, setEnabled] = useState(row.enabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isUser = row.origin === 'user';

  const onToggle = async (): Promise<void> => {
    setPending(true);
    setError(null);
    try {
      // 注意：host 端 pluginAudit/toggle 的 disabled 语义是「true=停用，false=启用」，
      // 而这里 enabled 表示「当前是否启用」（= !entry.disabled）。用户点「停用」时
      // enabled 为 true，目标状态就是 disabled=true，所以要传 enabled 本身，
      // 不能传 !enabled（那会把「停用」变成「启用」，导致持久化 changed=false、
      // 状态不变，只剩页面刷新——v0.5 修复）。
      await toggle(row.entryId, enabled);
      // 开关已持久化并即时生效（host 侧 loader fiber 已停用/启用）。但 client 侧
      // 的插件 fiber 是页面加载时按 boot manifest 构建的，侧边栏等 UI 不会自动
      // 消失——整页刷新一次，让所见即所得（host 树里该条目已不在，刷新后即移除）。
      setEnabled(!enabled); // 兜底：刷新被环境拦截时本地状态仍正确
      try {
        window.location.reload();
      } catch {
        // 某些内嵌环境禁止刷新；本地状态已翻转，不当作错误。
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <li className="dshPluginAudit_card" data-origin={row.origin}>
      <div className="dshPluginAudit_cardTitle" title={row.moduleName}>
        {shortName(row.moduleName)}
      </div>
      {/* 功能描述（v0.6）：读 package.json 的 description，有内容才显示，两行截断。 */}
      {description !== undefined && description.length > 0 ? (
        <p className="dshPluginAudit_cardDesc" title={description}>
          {description}
        </p>
      ) : null}
      <div className="dshPluginAudit_cardMeta">
        <span className="dshPluginAudit_badge" data-enabled={enabled ? 'true' : 'false'}>
          {enabled ? t('enabled') : t('disabled')}
        </span>
        <span className="dshPluginAudit_badge" data-origin={row.origin}>
          {source}
        </span>
        <code className="dshPluginAudit_entry">{row.entryId}</code>
      </div>
      {error !== null ? (
        <p className="dshPluginAudit_toggleError" role="alert">
          {t('toggleError')}：{error}
        </p>
      ) : null}
      {/* 操作按钮放卡片底部：自装插件才有，官方/内置无按钮。
          「更新」（或「已是最新」）在左，「停用/启用」在右（用户要求，v0.6）。 */}
      {isUser ? (
        <>
          <div className="dshPluginAudit_cardActions">
            {/* 更新按钮：有更新状态且可更新时才显示；最新版显示灰字。 */}
            {updateStatus !== undefined && updateStatus !== null ? (
              updateStatus.outdated ? (
                <button
                  type="button"
                  className="dshPluginAudit_updateAction"
                  disabled={isUpdating}
                  onClick={() => onUpdate?.(row.moduleName)}
                >
                  {isUpdating ? t('updating') : t('update')}
                </button>
              ) : (
                <span className="dshPluginAudit_updateUpToDate" title={updateStatus.currentVersion}>
                  {t('upToDateShort')}
                </span>
              )
            ) : null}
            <button
              type="button"
              className="dshPluginAudit_toggle"
              disabled={pending}
              onClick={() => void onToggle()}
              data-enabled={enabled ? 'true' : 'false'}
            >
              {pending ? t('toggling') : enabled ? t('toggleOff') : t('toggleOn')}
            </button>
          </div>
          {/* 更新进度条（v0.6）：该卡片正在更新时显示不确定进度动画。 */}
          {isUpdating ? (
            <div
              className="dshPluginAudit_progress"
              role="progressbar"
              aria-label={t('updating')}
              aria-valuetext={t('updating')}
            />
          ) : null}
        </>
      ) : null}
    </li>
  );
}

function Section({
  title,
  rows,
  query,
  toggle,
  t,
  updates,
  onUpdate,
  updating,
  descriptions,
}: {
  title: string;
  rows: Row[];
  query: string;
  toggle: SourceTabInject['toggle'];
  t: (k: string) => string;
  updates?: Record<string, ClientUpdateStatus> | null;
  onUpdate?: (moduleName: string) => void;
  updating?: string[] | null;
  descriptions?: Record<string, string> | null;
}): ReactElement | null {
  const normalized = query.trim().toLocaleLowerCase();
  const filtered =
    normalized.length === 0
      ? rows
      : rows.filter(
          (r) =>
            r.moduleName.toLocaleLowerCase().includes(normalized) ||
            r.entryId.toLocaleLowerCase().includes(normalized),
        );
  if (filtered.length === 0) return null;
  return (
    <section className="dshPluginAudit_section">
      <h3 className="dshPluginAudit_heading">
        {title} <span>{filtered.length}</span>
      </h3>
      <ul className="dshPluginAudit_cards">
        {filtered.map((row) => (
          <RowCard
            key={row.entryId}
            row={row}
            toggle={toggle}
            t={t}
            updateStatus={updates ? updates[row.moduleName] ?? null : null}
            onUpdate={onUpdate}
            updating={updating}
            description={descriptions ? descriptions[row.moduleName] : undefined}
          />
        ))}
      </ul>
    </section>
  );
}

/** 「来源」tab 本体。 */
export function SourceTab({
  list,
  toggle,
  t,
  updates,
  onUpdate,
  updating,
  descriptions,
}: SourceTabProps): ReactElement {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [request, setRequest] = useState(0);
  const [query, setQuery] = useState('');

  // 首次挂载 + 重试时拉取快照。
  useEffect(() => {
    let current = true;
    void Promise.resolve()
      .then(() => list())
      .then((snapshot) => {
        if (current) setState({ status: 'ready', entries: snapshot.entries });
      })
      .catch(() => {
        if (current) setState({ status: 'error' });
      });
    return () => {
      current = false;
    };
  }, [list, request]);

  const rows = useMemo(() => (state.status === 'ready' ? classify(state.entries) : []), [state]);
  const official = rows.filter((r) => r.origin === 'official');
  const user = rows.filter((r) => r.origin === 'user');

  if (state.status === 'loading') {
    return <p className="dshPluginAudit_status">{t('loading')}</p>;
  }
  if (state.status === 'error') {
    return (
      <div className="dshPluginAudit_failure">
        <p role="alert">{t('error')}</p>
        <button
          type="button"
          onClick={() => {
            setState({ status: 'loading' });
            setRequest((v) => v + 1);
          }}
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="dshPluginAudit_root">
      <label className="dshPluginAudit_search">
        <input
          type="search"
          value={query}
          placeholder={t('search')}
          aria-label={t('search')}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </label>
      {rows.length === 0 ? <p className="dshPluginAudit_status">{t('empty')}</p> : null}
      <Section
        title={t('user')}
        rows={user}
        query={query}
        toggle={toggle}
        t={t}
        updates={updates}
        onUpdate={onUpdate}
        updating={updating}
        descriptions={descriptions}
      />
      <Section
        title={t('official')}
        rows={official}
        query={query}
        toggle={toggle}
        t={t}
        updates={updates}
        onUpdate={onUpdate}
        updating={updating}
        descriptions={descriptions}
      />
    </div>
  );
}
