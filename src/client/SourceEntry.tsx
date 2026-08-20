// @file src/client/SourceEntry.tsx
// @description 侧边栏底部「插件目录」入口（sidebar.footer.action 插槽）：
//              图标按钮（rail/wide 两种形态），点击后用 createPortal 弹出居中
//              面板。面板内：
//                - 顶部「更新」工具条：统计可更新总数 + 「全部更新」按钮（v0.6）；
//                - 下方 SourceTab：官方/自装分组，每张自装卡片带「停用/启用」+
//                  「更新」按钮（已是最新版显示灰字「已是最新」）。
//
// 为什么用这个插槽而不是设置页 tab（v0.5 变更，用户需求）：
//   - 用户希望「来源」独立出来放在左侧菜单栏，不再藏在 设置 → 插件 里；
//   - sidebar.footer.action 是官方提供的「设置按钮旁的附加动作」list 插槽，
//     dsh-remote-web-ui 的远端控制入口就是这么做的（图标按钮 + portal 面板），
//     本实现复刻同一模式（TooltipAnchor + mask/panel overlay），保证与 shell 协调；
//   - owner props 只有 { wide }（侧边栏宽态 = false 时是 56px rail），
//     locale 通过注册项的 locale 字段注入到 props.t。
//
// 更新交互（v0.6）：检查/更新逻辑统一提升到面板级（本组件持有 updates face），
// 顶部工具条与每张卡片的「更新」按钮共用同一套 runUpdate/check 状态，保证
// 「全部更新」与「单个更新」的结果一致反映。

import { useCallback, useEffect, useMemo, useSyncExternalStore, useState } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { SourceTab } from './SourceTab';
import type { ClientUpdateStatus, SourceTabInject } from './SourceTab';
import type { CheckUpdatesResult, PluginMetadata, UninstallResult, UpdateResult } from '../contract';
import type { ClientPluginMetadata } from './SourceTab';
import {
  clearUpdateTask,
  getUpdateTask,
  isUpdating,
  startUpdateTask,
  subscribeUpdateTask,
} from './updateStore';
import type { UpdateTask } from './updateStore';

/** sidebar.footer.action 的 owner props（catalog 已核实：只有 wide）。 */
export interface SourceEntryOwnerProps {
  /** 侧边栏是否宽态渲染（false = 56px rail）。 */
  wide: boolean;
}

/** pluginAudit remote 的调用面（checkUpdates / update / uninstall 新增于 v0.6）。 */
export interface PluginAuditUpdateFace {
  checkUpdates(): Promise<
    | { ok: true; value: CheckUpdatesResult }
    | { ok: false; error: { code: string; message: string } }
  >;
  update(moduleNames: string[]): Promise<
    | { ok: true; value: UpdateResult }
    | { ok: false; error: { code: string; message: string } }
  >;
  descriptions(moduleNames: string[]): Promise<
    | { ok: true; value: Record<string, PluginMetadata> }
    | { ok: false; error: { code: string; message: string } }
  >;
  uninstall(moduleName: string): Promise<
    | { ok: true; value: UninstallResult }
    | { ok: false; error: { code: string; message: string } }
  >;
}

/** 本入口的完整 props：owner props + SourceTab 的能力 + locale 绑定的 t。 */
export type SourceEntryProps = SourceEntryOwnerProps &
  SourceTabInject & {
    t: (key: string) => string;
    /**
     * 更新 remote 调用面（由 apply 注入）。
     *
     * 注意：这是一个 Promise —— inject 工厂里 `ensureMounted()` 返回的是
     * `Promise<face>`（$mount 异步 + reflect.get）。直接在组件里
     * `updates.checkUpdates()` 会报 "checkUpdates is not a function"
     * （v0.6 修复：组件先用 useEffect resolve 出 face 再调用）。
     */
    updates?: Promise<PluginAuditUpdateFace> | null;
    /** 当前 locale id（如 'zh' / 'en'）——描述按系统语言切换用（v0.6）。 */
    getLocale?: () => string;
  };

/** 内联「目录」图标（不引入 icon 库，stroke 走 currentColor 跟随文字色）。 */
function DirectoryIcon({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M3 11h18" />
    </svg>
  );
}

/** 面板右上角关闭按钮的 × 图标。 */
function CloseIcon(): ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** 面板级检查状态（更新任务状态见 updateStore 的 UpdateTask）。 */
type PanelUpdateView =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'result'; result: CheckUpdatesResult }
  | { kind: 'error'; message: string };

/** 由 CheckUpdatesResult 构建按模块名索引的卡片状态。 */
function indexByModule(result: CheckUpdatesResult): Record<string, ClientUpdateStatus> {
  const byModule: Record<string, ClientUpdateStatus> = {};
  for (const p of result.packages) {
    byModule[p.moduleName] = {
      moduleName: p.moduleName,
      currentVersion: p.currentVersion,
      latestVersion: p.latestVersion,
      outdated: p.outdated,
      error: p.error,
      installSource: p.installSource,
    };
  }
  return byModule;
}

/**
 * 面板内的「更新」管理区：顶部工具条（统计 + 全部更新）+ 更新结果反馈。
 * 渲染优先级：模块级 store 的更新任务（running/done）优先于本地检查视图（view）。
 */
function UpdateBar({
  view,
  task,
  t,
  onCheck,
  onUpdateAll,
  lastResult,
}: {
  view: PanelUpdateView;
  task: UpdateTask;
  t: (k: string) => string;
  onCheck: () => void;
  onUpdateAll: (names: string[]) => void;
  /** 最后一次成功的检查结果（checking 时仍保留，全部更新按钮不消失）。 */
  lastResult: CheckUpdatesResult | null;
}): ReactElement {
  const busy = task.kind === 'running';
  const outdated =
    lastResult !== null && !lastResult.registryUnreachable
      ? lastResult.packages.filter((p) => p.outdated)
      : [];

  // 状态文案：更新任务优先，其次检查视图。
  let status: string;
  if (task.kind === 'running') status = t('updating');
  else if (task.kind === 'done') status = task.ok ? t('updated') : t('updateFailed');
  else if (view.kind === 'checking' || view.kind === 'idle') status = t('checking');
  else if (view.kind === 'error') status = t('updateFailed');
  else if (view.kind === 'result' && view.result.registryUnreachable) status = t('registryUnreachable');
  else if (view.kind === 'result') status = `${t('outdated')}: ${outdated.length}`;
  else status = t('checking');

  return (
    <div className="dshPluginAudit_update">
      <div className="dshPluginAudit_updateHead">
        <span className="dshPluginAudit_updateTitle">{t('update')}</span>
        <span className="dshPluginAudit_updateStatus">{status}</span>
        {view.kind !== 'checking' && view.kind !== 'idle' ? (
          <button type="button" className="dshPluginAudit_updateAction" onClick={onCheck}>
            {t('recheck')}
          </button>
        ) : null}
        {view.kind === 'result' && outdated.length > 0 && task.kind !== 'running' ? (
          <button
            type="button"
            className="dshPluginAudit_updateAction dshPluginAudit_updateAll"
            disabled={busy}
            onClick={() => onUpdateAll(outdated.map((p) => p.moduleName))}
          >
            {busy ? t('updating') : t('updateAll')}
          </button>
        ) : null}
      </div>
      {task.kind === 'running' ? (
        <p className="dshPluginAudit_updateHint">
          {t('updateHint')}：{task.names.join(', ')}
        </p>
      ) : task.kind === 'done' && !task.ok ? (
        <p className="dshPluginAudit_updateError" role="alert">
          {task.message || t('updateFailed')}
        </p>
      ) : task.kind === 'done' ? (
        <>
          <p className="dshPluginAudit_updateHint">
            {t('updatedDetail')}: {task.names.join(', ')}
          </p>
          {task.result !== null && task.result.output.trim().length > 0 ? (
            <pre className="dshPluginAudit_updateOutput">{task.result.output.slice(-2000)}</pre>
          ) : null}
        </>
      ) : view.kind === 'error' ? (
        <p className="dshPluginAudit_updateError" role="alert">
          {view.message}
        </p>
      ) : view.kind === 'result' && view.result.registryUnreachable ? (
        <p className="dshPluginAudit_updateHint" role="alert">
          {t('registryUnreachableDetail')}
        </p>
      ) : view.kind === 'result' && outdated.length === 0 ? (
        <p className="dshPluginAudit_updateHint">{t('upToDate')}</p>
      ) : null}
    </div>
  );
}

/**
 * 侧边栏底部「插件目录」入口。
 *
 * @param props wide=侧边栏宽态；list/toggle=SourceTab 需要的能力（由 apply 注入）；
 *              updates=更新 remote 调用面；t=locale 绑定的翻译函数。
 * @returns 触发按钮 +（打开时）portal 渲染的居中面板。
 */
export function SourceEntry({
  wide,
  list,
  toggle,
  t,
  updates,
  getLocale,
}: SourceEntryProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelUpdateView>({ kind: 'idle' });
  // 最后一次成功的检查结果（独立于 view 保存）：checking / 更新中时不随 view
  // 清空，保证卡片更新按钮始终可见（v0.6 修复「更新第二个按钮消失」）。
  const [lastResult, setLastResult] = useState<CheckUpdatesResult | null>(null);
  // resolve 注入的 Promise<face>（$mount 是异步的）——resolve 前视为不可用。
  const [face, setFace] = useState<PluginAuditUpdateFace | null>(null);
  // moduleName → 本地元数据（描述、版本、GitHub 仓库）。
  const [pluginMetadata, setPluginMetadata] = useState<Record<string, ClientPluginMetadata> | null>(null);
  // 正在卸载的模块名（组件内 state，卸载需用户确认，不跨面板保留）。
  const [uninstalling, setUninstalling] = useState<string | null>(null);
  // 更新任务状态（模块级 store）：面板关闭再打开仍可恢复「更新中/已完成/失败」。
  const task = useSyncExternalStore(subscribeUpdateTask, getUpdateTask);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (updates === undefined || updates === null) {
      setFace(null);
      return;
    }
    let current = true;
    updates
      .then((value) => {
        if (current) setFace(value);
      })
      .catch(() => {
        if (current) setFace(null);
      });
    return () => {
      current = false;
    };
  }, [updates]);

  // face 就绪且面板打开时：批量读取每个包的描述、版本与 GitHub 仓库；描述按
  // 当前系统语言选择，版本与链接完全来自已安装 package.json，不额外访问网络。
  useEffect(() => {
    if (!open || face === null) return;
    let current = true;
    void (async () => {
      try {
        const snapshot = await list();
        const names = [...new Set(snapshot.entries.map((e) => e.moduleName))];
        const result = await face.descriptions(names);
        if (!current) return;
        if (result.ok) {
          const localized: Record<string, ClientPluginMetadata> = {};
          const isZh = typeof getLocale === 'function' && getLocale().startsWith('zh');
          for (const [name, text] of Object.entries(result.value)) {
            localized[name] = {
              description: isZh ? text.zh : text.en,
              version: text.version,
              githubUrl: text.githubUrl,
            };
          }
          setPluginMetadata(localized);
        } else {
          setPluginMetadata({});
        }
      } catch {
        if (current) setPluginMetadata({});
      }
    })();
    return () => {
      current = false;
    };
  }, [open, face, list, getLocale]);

  const runCheck = useCallback(async (): Promise<void> => {
    if (face === null) return;
    setView({ kind: 'checking' });
    try {
      const result = await face.checkUpdates();
      if (!result.ok) {
        setView({ kind: 'error', message: `${t('updateError')}: ${result.error.message}` });
        return;
      }
      // 同时更新 view 与 lastResult。lastResult 供顶栏保留上一次统计，但卡片在
      // checking 期间会忽略旧结果，统一显示灰色禁用的「更新」，避免误操作。
      setView({ kind: 'result', result: result.value });
      setLastResult(result.value);
    } catch (cause) {
      setView({ kind: 'error', message: cause instanceof Error ? cause.message : String(cause) });
    }
  }, [face, t]);

  const runUpdate = useCallback(
    async (names: string[]): Promise<void> => {
      if (face === null) return;
      // 首个调用负责队列耗尽后的唯一一次重查；更新中发生的后续点击只入队，
      // 避免每个点击都挂一个 runCheck，造成重复 registry 请求与状态竞争。
      const joinedRunningTask = isUpdating();
      // 更新状态写入模块级 store（面板关闭后仍可见/可恢复）。
      const taskResult = await startUpdateTask(face, names);
      if (joinedRunningTask) return;
      // 更新结束（成功或失败）后自动重查一次，反映最新版本并刷新卡片状态；
      // 重查完成后清除 task 的 done 状态，让顶栏回到「可更新: N」——
      // 否则顶栏会一直显示「已更新」与卡片的「更新」按钮脱节（v0.6 修复）。
      if (taskResult.kind === 'done') {
        await runCheck();
        clearUpdateTask();
      }
    },
    [face, runCheck],
  );

  // 卸载一个自装插件：确认后调 remote，成功后刷新列表/检查。
  const runUninstall = useCallback(
    async (moduleName: string): Promise<void> => {
      if (face === null) return;
      // 卸载是破坏性操作，先经用户确认（组件内 confirm）。
      if (!window.confirm(t('uninstallConfirm').replace('{name}', moduleName))) return;
      setUninstalling(moduleName);
      try {
        const result = await face.uninstall(moduleName);
        if (!result.ok) {
          setView({ kind: 'error', message: `${t('updateError')}: ${result.error.message}` });
          return;
        }
        setView({ kind: 'error', message: '' }); // 清空旧错误
        // 卸载后重查一次，让被卸载的插件从列表/检查结果中消失。
        await runCheck();
      } catch (cause) {
        setView({ kind: 'error', message: cause instanceof Error ? cause.message : String(cause) });
      } finally {
        setUninstalling(null);
      }
    },
    [face, runCheck, t],
  );

  // 打开面板时：若没有正在进行的更新任务且未检查过，则自动检查一次。
  useEffect(() => {
    if (!open) return;
    if (view.kind === 'idle' && task.kind !== 'running' && face !== null) void runCheck();
    // 只在打开时触发一次；后续由「重新检查」按钮驱动。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, face]);

  // Esc 关闭面板（可访问性：dialog 语义 + 键盘可达）。
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // 卡片更新状态来自最后一次成功结果；重新检查期间必须屏蔽旧结果，让所有卡片
  // 进入灰色禁用态。顶栏仍可独立保留 lastResult，不会出现统计内容闪烁。
  const byModule = useMemo(
    () => (view.kind !== 'checking' && lastResult !== null ? indexByModule(lastResult) : null),
    [lastResult, view.kind],
  );
  // 正在更新的模块名数组：来自模块级 store 的 running 任务（面板关闭后仍正确；
  // 多包更新时每张对应卡片各自显示进度条）。
  const updatingNames = task.kind === 'running' ? task.names : null;

  return (
    <>
      <button
        type="button"
        className="dshPluginAudit_entryTrigger"
        data-wide={wide ? 'wide' : 'rail'}
        aria-label={t('entry')}
        title={t('entry')}
        onClick={() => setOpen(true)}
      >
        <DirectoryIcon size={wide ? 16 : 18} />
        {/* 宽态下显示文字标签，rail 态只留图标（与设置按钮的几何一致）。 */}
        {wide ? <span className="dshPluginAudit_entryLabel">{t('entry')}</span> : null}
      </button>
      {open
        ? createPortal(
            <div className="dshPluginAudit_overlay" role="presentation">
              {/* 点击遮罩关闭 */}
              <div className="dshPluginAudit_mask" aria-hidden="true" onClick={close} />
              <div
                className="dshPluginAudit_panel"
                role="dialog"
                aria-modal="true"
                aria-label={t('entry')}
              >
                <div className="dshPluginAudit_panelHeader">
                  <h2 className="dshPluginAudit_panelTitle">{t('entry')}</h2>
                  <button
                    type="button"
                    className="dshPluginAudit_panelClose"
                    aria-label={t('close')}
                    onClick={close}
                  >
                    <CloseIcon />
                  </button>
                </div>
                {/* 更新工具条（v0.6）：face resolve 后显示；缺失/未就绪时静默隐藏。 */}
                {face !== null ? (
                  <UpdateBar
                    view={view}
                    task={task}
                    t={t}
                    onCheck={() => void runCheck()}
                    onUpdateAll={(names) => void runUpdate(names)}
                    lastResult={lastResult}
                  />
                ) : null}
                {/* 面板正文复用「来源」tab 的完整 UI（搜索 + 分组 + 开关 + 卡片更新按钮）。 */}
                <SourceTab
                  list={list}
                  toggle={toggle}
                  t={t}
                  updates={byModule}
                  updating={updatingNames}
                  onUpdate={(moduleName) => void runUpdate([moduleName])}
                  onUninstall={(moduleName) => void runUninstall(moduleName)}
                  uninstalling={uninstalling}
                  pluginMetadata={pluginMetadata}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
