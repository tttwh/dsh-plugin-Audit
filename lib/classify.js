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
function classifyEntry(entry, extraUserPackages = /* @__PURE__ */ new Set()) {
  const { origin, reason } = classifyOrigin(entry.options.name, extraUserPackages);
  return {
    entryId: entry.id,
    moduleName: entry.options.name,
    origin,
    reason,
    // 配置行原始 id（写 cordis.patch.yml 用，见 ClassifiedEntry.configId 注释）
    configId: entry.options.id ?? entry.id,
    // 与 host-plugin-inventory 的投影一致：enabled = 未 disabled
    enabled: !entry.disabled,
    // 简化的 fiber 阶段；CLI 场景下不一定有 fiber，稳妥地给 null
    fiberPhase: entry.fiber ? String(entry.fiber.state) : null
  };
}
function groupByOrigin(entries) {
  const official = [];
  const user = [];
  const builtin = [];
  for (const entry of entries) {
    if (entry.origin === "official") official.push(entry);
    else if (entry.origin === "builtin") builtin.push(entry);
    else user.push(entry);
  }
  return { official, user, builtin };
}
export {
  BUILTIN_PREFIX,
  OFFICIAL_SCOPE,
  classifyEntry,
  classifyOrigin,
  groupByOrigin
};
//# sourceMappingURL=classify.js.map
