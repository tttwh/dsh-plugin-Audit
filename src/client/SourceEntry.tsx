// @file src/client/SourceEntry.tsx
// @description 侧边栏底部「插件目录」入口（sidebar.footer.action 插槽）：
//              图标按钮（rail/wide 两种形态），点击后用 createPortal 弹出居中
//              面板，面板内复用 SourceTab（官方/自装分组 + 开关按钮）。
//
// 为什么用这个插槽而不是设置页 tab（v0.5 变更，用户需求）：
//   - 用户希望「来源」独立出来放在左侧菜单栏，不再藏在 设置 → 插件 里；
//   - sidebar.footer.action 是官方提供的「设置按钮旁的附加动作」list 插槽，
//     dsh-remote-web-ui 的远端控制入口就是这么做的（图标按钮 + portal 面板），
//     本实现复刻同一模式（TooltipAnchor + mask/panel overlay），保证与 shell 协调；
//   - owner props 只有 { wide }（侧边栏宽态 = false 时是 56px rail），
//     locale 通过注册项的 locale 字段注入到 props.t。

import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { SourceTab } from './SourceTab';
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

/**
 * 侧边栏底部「插件目录」入口。
 *
 * @param props wide=侧边栏宽态；list/toggle=SourceTab 需要的能力（由 apply 注入）；
 *              t=locale 绑定的翻译函数（slot 按注册项的 locale 注入）。
 * @returns 触发按钮 +（打开时）portal 渲染的居中面板。
 */
export function SourceEntry({ wide, list, toggle, t }: SourceEntryProps): ReactElement {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  // Esc 关闭面板（可访问性：dialog 语义 + 键盘可达）。
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

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
                {/* 面板正文复用「来源」tab 的完整 UI（搜索 + 分组 + 开关）。 */}
                <SourceTab list={list} toggle={toggle} t={t} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
