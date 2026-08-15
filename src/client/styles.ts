// @file src/client/styles.ts
// @description 「来源」tab 的样式表，仿照官方社区插件 dsh-at-file 的做法：
//              手写成模板字符串、由插件体注入一次（web 服务器每个 client 插件只
//              服务一个文件，不能有独立 CSS 产物）。颜色只引用共享的 --dsw-alias-*
//              设计令牌，类名带 dshPluginAudit 前缀避免与 shell 内其他插件冲突。

/** 稳定 `<style>` 元素 id（HMR 重跑时幂等注入）。 */
export const STYLE_ID = 'dsh-plugin-audit-style';

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
.dshPluginAudit_toggleError {
  margin: 0;
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
`;

/** 注入一次样式表（幂等，HMR 安全）。 */
export function adoptStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = cssText;
  document.head.appendChild(style);
}
