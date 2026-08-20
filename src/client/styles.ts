// @file src/client/styles.ts
// @description 「来源」tab 的样式表，仿照官方社区插件 dsh-at-file 的做法：
//              手写成模板字符串、由插件体注入一次（web 服务器每个 client 插件只
//              服务一个文件，不能有独立 CSS 产物）。颜色只引用共享的 --dsw-alias-*
//              设计令牌，类名带 dshPluginAudit 前缀避免与 shell 内其他插件冲突。

/** 稳定 `<style>` 元素 id（HMR 重跑时幂等注入）。 */
export const STYLE_ID = 'dsh-plugin-diraud-style';

export const cssText = `
.dshPluginAudit_root {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 760px;
  color: var(--dsw-alias-label-primary);
}
.dshPluginAudit_search input {
  box-sizing: border-box;
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  outline: none;
}
.dshPluginAudit_search input:focus-visible {
  border-color: var(--dsw-alias-state-business-primary);
}
.dshPluginAudit_section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dshPluginAudit_heading {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin: 0;
  padding: 0 2px;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
}
.dshPluginAudit_heading span {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.dshPluginAudit_cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.dshPluginAudit_card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-3);
}
.dshPluginAudit_cardTitle {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}
/* 卡片功能描述（v0.6）：两行截断，弱化文字色。 */
.dshPluginAudit_cardDesc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 17px;
}
.dshPluginAudit_cardMeta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.dshPluginAudit_badge {
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}
.dshPluginAudit_badge[data-enabled='true'] {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);
  color: var(--dsw-alias-state-success-primary);
}
.dshPluginAudit_badge[data-origin='user'] {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent);
  color: var(--dsw-alias-state-business-primary);
}
.dshPluginAudit_entry {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--ds-font-family-code);
  font-size: 11px;
  line-height: 16px;
}
.dshPluginAudit_toggle {
  padding: 2px 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}
.dshPluginAudit_toggle:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dshPluginAudit_toggle:disabled {
  opacity: 0.6;
  cursor: default;
}
.dshPluginAudit_toggle[data-enabled='true'] {
  color: var(--dsw-alias-state-error-primary);
}
.dshPluginAudit_toggle[data-enabled='false'] {
  color: var(--dsw-alias-state-success-primary);
}
/* 开关按钮区：卡片底部，上边框分隔，按钮靠右 */
.dshPluginAudit_cardActions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.dshPluginAudit_toggleError {
  margin: 8px 0 0;
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}
.dshPluginAudit_status,
.dshPluginAudit_failure {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dshPluginAudit_failure {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--dsw-alias-state-error-primary);
}
.dshPluginAudit_failure button {
  padding: 4px 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: none;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  cursor: pointer;
}
@media (max-width: 680px) {
  .dshPluginAudit_cards {
    grid-template-columns: minmax(0, 1fr);
  }
}
/* 侧边栏底部入口按钮（rail 态 = 圆图标；wide 态 = 图标 + 文字，对齐设置按钮几何）。 */
.dshPluginAudit_entryTrigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 36px;
  padding: 0 10px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  white-space: nowrap;
  transition: background-color 0.12s, color 0.12s;
}
.dshPluginAudit_entryTrigger[data-wide='rail'] {
  width: 36px;
  padding: 0;
  border-radius: 50%;
}
.dshPluginAudit_entryTrigger:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dshPluginAudit_entryTrigger:active:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-active);
}
.dshPluginAudit_entryTrigger:focus-visible {
  box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-2), 0 0 0 4px var(--dsw-alias-brand-primary);
  outline: none;
}
/* 弹出层：全屏遮罩 + 居中面板（dsh-remote-web-ui 同款 overlay 模式）。 */
.dshPluginAudit_overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}
.dshPluginAudit_mask {
  position: absolute;
  inset: 0;
  background: var(--dsw-alias-bg-mask-1);
  backdrop-filter: var(--dsw-mask-blur);
}
.dshPluginAudit_panel {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 680px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 48px);
  padding: 24px;
  overflow: auto;
  border-radius: 24px;
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-shadow-lv3);
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 22px;
}
.dshPluginAudit_panelHeader {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.dshPluginAudit_panelTitle {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
}
.dshPluginAudit_panelClose {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 50%;
  transition: background-color 0.12s, color 0.12s;
}
.dshPluginAudit_panelClose:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dshPluginAudit_panelClose:focus-visible {
  box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-2), 0 0 0 4px var(--dsw-alias-brand-primary);
  outline: none;
}
@media (prefers-reduced-motion: reduce) {
  .dshPluginAudit_entryTrigger,
  .dshPluginAudit_panelClose {
    transition: none;
  }
}
/* 「插件目录」面板里的更新区块（v0.6）。 */
.dshPluginAudit_update {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
}
.dshPluginAudit_updateHead {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dshPluginAudit_updateTitle {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
}
.dshPluginAudit_updateStatus {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}
.dshPluginAudit_updateAction {
  padding: 2px 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
  white-space: nowrap;
}
.dshPluginAudit_updateAction:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dshPluginAudit_updateAction:disabled {
  opacity: 0.6;
  cursor: default;
}
/* 「全部更新」强调按钮（primary 色调）。 */
.dshPluginAudit_updateAll {
  border-color: var(--dsw-alias-state-business-primary);
  color: var(--dsw-alias-state-business-primary);
}
.dshPluginAudit_updateAll:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent);
}
/* 「已是最新」灰字（卡片更新区）。 */
.dshPluginAudit_updateUpToDate {
  padding: 2px 10px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}
/* 卸载按钮（v0.6）：红色弱化，放最右。 */
.dshPluginAudit_uninstall {
  padding: 2px 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-state-error-primary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
  white-space: nowrap;
}
.dshPluginAudit_uninstall:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
}
.dshPluginAudit_uninstall:disabled {
  opacity: 0.6;
  cursor: default;
}
.dshPluginAudit_updateHint,
.dshPluginAudit_updateError {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
}
.dshPluginAudit_updateHint {
  color: var(--dsw-alias-label-secondary);
}
.dshPluginAudit_updateError {
  color: var(--dsw-alias-state-error-primary);
}
.dshPluginAudit_updateOutput {
  max-height: 140px;
  margin: 0;
  padding: 8px 10px;
  overflow: auto;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--ds-font-family-code);
  font-size: 11px;
  line-height: 16px;
  white-space: pre-wrap;
  word-break: break-all;
}
.dshPluginAudit_updateList {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.dshPluginAudit_updateItem {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dshPluginAudit_updateName {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 20px;
}
.dshPluginAudit_updateVersions {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* 卡片更新进度条（v0.6）：不确定进度动画，更新中显示。 */
.dshPluginAudit_progress {
  position: relative;
  height: 4px;
  border-radius: 999px;
  background: var(--dsw-alias-interactive-bg-hover);
  overflow: hidden;
}
.dshPluginAudit_progress::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40%;
  border-radius: 999px;
  background: var(--dsw-alias-state-business-primary);
  animation: dshPluginAudit_progressSlide 1.2s ease-in-out infinite;
}
@keyframes dshPluginAudit_progressSlide {
  0% {
    left: -40%;
  }
  100% {
    left: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .dshPluginAudit_progress::after {
    animation-duration: 2.4s;
  }
}
`;

/** 注入一次样式表（幂等，HMR 安全）。 */
export function adoptStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = cssText;
  document.head.appendChild(style);
}
