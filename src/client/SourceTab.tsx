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

export interface SourceTabProps {
  list: SourceTabInject['list'];
  toggle: SourceTabInject['toggle'];
  t: (key: string) => string;
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
}: {
  row: Row;
  toggle: SourceTabInject['toggle'];
  t: (k: string) => string;
}): ReactElement {
  const source =
    row.origin === 'official' ? t('official') : row.origin === 'user' ? t('user') : 'builtin';
  // 开关状态本地持有：切换成功后即时翻转，避免每次重新拉全量列表。
  const [enabled, setEnabled] = useState(row.enabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isUser = row.origin === 'user';

  const onToggle = async (): Promise<void> => {
    setPending(true);
    setError(null);
    try {
      await toggle(row.entryId, !enabled);
      setEnabled(!enabled);
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
      {/* 开关按钮统一放卡片底部：自装插件才有，官方/内置无按钮。 */}
      {isUser ? (
        <div className="dshPluginAudit_cardActions">
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
}: {
  title: string;
  rows: Row[];
  query: string;
  toggle: SourceTabInject['toggle'];
  t: (k: string) => string;
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
          <RowCard key={row.entryId} row={row} toggle={toggle} t={t} />
        ))}
      </ul>
    </section>
  );
}

/** 「来源」tab 本体。 */
export function SourceTab({ list, toggle, t }: SourceTabProps): ReactElement {
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
      <Section title={t('user')} rows={user} query={query} toggle={toggle} t={t} />
      <Section title={t('official')} rows={official} query={query} toggle={toggle} t={t} />
    </div>
  );
}
