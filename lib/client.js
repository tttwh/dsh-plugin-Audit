window.__ModuleLoader__.load({ id: 'dsh-plugin-audit', factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/SourceTab.tsx
var import_react = require("react");

// src/classify.ts
var OFFICIAL_SCOPE = "@deepseek-ai/";
var BUILTIN_PREFIX = "cordis:";
function classifyOrigin(moduleName, extraUserPackages = /* @__PURE__ */ new Set()) {
  if (moduleName.startsWith(BUILTIN_PREFIX)) {
    return { origin: "builtin", reason: "cordis: \u5185\u7F6E\u57FA\u5EFA\u6A21\u5757" };
  }
  if (extraUserPackages.has(moduleName)) {
    return { origin: "user", reason: "\u5728 profile dependencies / extraUserPackages \u4E2D\u663E\u5F0F\u5B89\u88C5" };
  }
  if (moduleName.startsWith(OFFICIAL_SCOPE)) {
    return { origin: "official", reason: "@deepseek-ai/ \u5B98\u65B9\u53D1\u884C\u4F5C\u7528\u57DF" };
  }
  return { origin: "user", reason: "\u975E @deepseek-ai/ \u4F5C\u7528\u57DF\uFF08\u81EA\u88C5\uFF09" };
}

// src/client/SourceTab.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function classify(entries) {
  return entries.map((entry) => ({
    ...entry,
    ...classifyOrigin(entry.moduleName, /* @__PURE__ */ new Set())
  }));
}
function shortName(moduleName) {
  if (moduleName.startsWith("@")) moduleName = moduleName.slice(moduleName.indexOf("/") + 1);
  return moduleName.replace(/^cordis-plugin-/, "").replace(/^dsh-(?:host-|client-)?/, "");
}
function RowCard({ row, t }) {
  const source = row.origin === "official" ? t("official") : row.origin === "user" ? t("user") : "builtin";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: "dshPluginAudit_card", "data-origin": row.origin, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dshPluginAudit_cardTitle", title: row.moduleName, children: shortName(row.moduleName) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshPluginAudit_cardMeta", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshPluginAudit_badge", "data-enabled": row.enabled ? "true" : "false", children: row.enabled ? t("enabled") : t("disabled") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshPluginAudit_badge", "data-origin": row.origin, children: source }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "dshPluginAudit_entry", children: row.entryId })
    ] })
  ] });
}
function Section({
  title,
  rows,
  query,
  t
}) {
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = normalized.length === 0 ? rows : rows.filter(
    (r) => r.moduleName.toLocaleLowerCase().includes(normalized) || r.entryId.toLocaleLowerCase().includes(normalized)
  );
  if (filtered.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dshPluginAudit_section", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { className: "dshPluginAudit_heading", children: [
      title,
      " ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: filtered.length })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "dshPluginAudit_cards", children: filtered.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RowCard, { row, t }, row.entryId)) })
  ] });
}
function SourceTab({ list, t }) {
  const [state, setState] = (0, import_react.useState)({ status: "loading" });
  const [request, setRequest] = (0, import_react.useState)(0);
  const [query, setQuery] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    let current = true;
    void Promise.resolve().then(() => list()).then((snapshot) => {
      if (current) setState({ status: "ready", entries: snapshot.entries });
    }).catch(() => {
      if (current) setState({ status: "error" });
    });
    return () => {
      current = false;
    };
  }, [list, request]);
  const rows = (0, import_react.useMemo)(() => state.status === "ready" ? classify(state.entries) : [], [state]);
  const official = rows.filter((r) => r.origin === "official");
  const user = rows.filter((r) => r.origin === "user");
  if (state.status === "loading") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dshPluginAudit_status", children: t("loading") });
  }
  if (state.status === "error") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshPluginAudit_failure", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", children: t("error") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          onClick: () => {
            setState({ status: "loading" });
            setRequest((v) => v + 1);
          },
          children: t("retry")
        }
      )
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshPluginAudit_root", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dshPluginAudit_search", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "search",
        value: query,
        placeholder: t("search"),
        "aria-label": t("search"),
        onChange: (event) => setQuery(event.currentTarget.value)
      }
    ) }),
    rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dshPluginAudit_status", children: t("empty") }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { title: t("user"), rows: user, query, t }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { title: t("official"), rows: official, query, t })
  ] });
}

// src/client/styles.ts
var STYLE_ID = "dsh-plugin-audit-style";
var cssText = `
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
function adoptStyles() {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = cssText;
  document.head.appendChild(style);
}

// src/client/index.ts
var inject = ["slots", "locale", "remote", "remote.pluginInventory"];
var NS = "settings.pluginAudit";
function apply(ctx) {
  adoptStyles();
  ctx.slots.inject(
    "settings.plugins.tab",
    () => {
      ctx.locale.register(NS, {
        zh: {
          tab: "\u6765\u6E90",
          search: "\u641C\u7D22\u63D2\u4EF6",
          official: "\u5B98\u65B9",
          user: "\u81EA\u88C5",
          enabled: "\u5DF2\u542F\u7528",
          disabled: "\u5DF2\u505C\u7528",
          loading: "\u6B63\u5728\u8BFB\u53D6\u63D2\u4EF6\u2026",
          error: "\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u63D2\u4EF6\u3002",
          retry: "\u91CD\u8BD5",
          empty: "\u6682\u65E0\u63D2\u4EF6\u3002"
        },
        en: {
          tab: "Origin",
          search: "Search plugins",
          official: "Official",
          user: "Self-installed",
          enabled: "Enabled",
          disabled: "Disabled",
          loading: "Reading plugins\u2026",
          error: "Plugins are temporarily unavailable.",
          retry: "Retry",
          empty: "No plugins are available."
        }
      });
      const t = ctx.locale.bind(NS);
      const list = async () => {
        const result = await ctx.remote.pluginInventory.list();
        if (!result.ok) {
          throw new Error(`pluginInventory.list failed: ${result.error.code}: ${result.error.message}`);
        }
        return result.value;
      };
      ctx.slots.register(
        {
          name: "settings.plugins.tab",
          id: "source",
          // 与官方 "all" / "configurable" 并列的新 tab
          order: 20,
          label: () => t("tab"),
          locale: NS,
          inject: () => ({ list })
        },
        SourceTab
      );
    }
  );
}
return module.exports; } });
//# sourceMappingURL=client.js.map
