// src/render.ts
var ORIGIN_LABEL = {
  official: "\u5B98\u65B9",
  user: "\u81EA\u88C5",
  builtin: "\u5185\u7F6E"
};
function stateTag(entry) {
  return entry.enabled ? "\u5DF2\u542F\u7528" : "\u5DF2\u505C\u7528";
}
function renderLine(entry, withReason) {
  const tag = stateTag(entry);
  const origin = ORIGIN_LABEL[entry.origin] ?? entry.origin;
  let line = `  [${tag}] ${entry.moduleName} \xB7 ${origin} \xB7 entry=${entry.entryId}`;
  if (withReason && entry.reason) line += ` \xB7 ${entry.reason}`;
  return line;
}
function renderGroups(groups, opts = {}) {
  const { withReason = false, listOfficial = false, listBuiltin = false } = opts;
  const total = groups.official.length + groups.user.length + groups.builtin.length;
  const lines = [];
  lines.push("\u63D2\u4EF6\u6765\u6E90\u5206\u7C7B\uFF08\u5B98\u65B9 vs \u81EA\u88C5\uFF09");
  lines.push(`\u603B\u8BA1 ${total}\uFF1A\u5B98\u65B9 ${groups.official.length} \xB7 \u81EA\u88C5 ${groups.user.length} \xB7 \u5185\u7F6E ${groups.builtin.length}`);
  lines.push("");
  lines.push(`\u2500\u2500 \u81EA\u88C5\u63D2\u4EF6\uFF08${groups.user.length}\uFF09\u2500\u2500`);
  if (groups.user.length === 0) {
    lines.push("  \uFF08\u65E0\uFF09");
  } else {
    for (const entry of groups.user) lines.push(renderLine(entry, withReason));
  }
  lines.push("");
  lines.push(`\u2500\u2500 \u5B98\u65B9\u63D2\u4EF6\uFF08${groups.official.length}\uFF09\u2500\u2500`);
  if (groups.official.length === 0) {
    lines.push("  \uFF08\u65E0\uFF09");
  } else if (listOfficial) {
    for (const entry of groups.official) lines.push(renderLine(entry, withReason));
  } else {
    lines.push(`  \u5168\u90E8\u4F4D\u4E8E @deepseek-ai/ \u5B98\u65B9\u53D1\u884C\u4F5C\u7528\u57DF\uFF08\u5171 ${groups.official.length} \u4E2A\uFF09\u3002`);
    lines.push("  \u8F93\u5165 /plugin-audit official \u53EF\u9010\u884C\u5217\u51FA\u5B98\u65B9\u63D2\u4EF6\u3002");
  }
  lines.push("");
  if (groups.builtin.length > 0) {
    lines.push(`\u2500\u2500 \u5185\u7F6E\u6A21\u5757\uFF08${groups.builtin.length}\uFF09\u2500\u2500`);
    if (listBuiltin) {
      for (const entry of groups.builtin) lines.push(renderLine(entry, withReason));
    } else {
      lines.push(`  cordis: \u524D\u7F00\u7684 Loader \u57FA\u5EFA\uFF08\u5171 ${groups.builtin.length} \u4E2A\uFF09\u3002`);
    }
  }
  return lines.join("\n");
}
export {
  renderGroups
};
//# sourceMappingURL=render.js.map
