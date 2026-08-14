// src/index.ts
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

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

// src/index.ts
var name = "plugin-audit";
var inject = ["loader", "commands"];
function readUserDependencies(home) {
  const set = /* @__PURE__ */ new Set();
  if (!home) return set;
  const profilesDir = join(home, "profiles");
  if (!existsSync(profilesDir)) return set;
  try {
    for (const dirent of readdirSync(profilesDir, { withFileTypes: true })) {
      if (!dirent.isDirectory() && !dirent.isSymbolicLink()) continue;
      const manifestPath = join(profilesDir, dirent.name, "package.json");
      if (!existsSync(manifestPath)) continue;
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        for (const key of Object.keys(manifest.dependencies ?? {})) set.add(key);
      } catch {
      }
    }
  } catch {
  }
  return set;
}
function parseInput(rawInput) {
  const input = rawInput.trim();
  if (input === "") return { view: "summary", query: "" };
  if (/^user$/i.test(input)) return { view: "user", query: "" };
  if (/^official$/i.test(input)) return { view: "official", query: "" };
  return { view: "query", query: input.toLocaleLowerCase() };
}
function snapshot(ctx, extraUserPackages) {
  const classified = [];
  for (const entry of ctx.loader.entries()) {
    if (entry.options.group) continue;
    classified.push(classifyEntry(entry, extraUserPackages));
  }
  return classified;
}
function render(classified, view, query) {
  const groups = groupByOrigin(classified);
  if (view === "user") {
    return renderGroups({ official: [], user: groups.user, builtin: [] }, { withReason: true });
  }
  if (view === "official") {
    return renderGroups({ official: groups.official, user: [], builtin: [] }, { listOfficial: true });
  }
  if (view === "query") {
    const matched = classified.filter(
      (e) => e.moduleName.toLocaleLowerCase().includes(query) || e.entryId.toLocaleLowerCase().includes(query)
    );
    return renderGroups(groupByOrigin(matched), { withReason: true, listOfficial: true, listBuiltin: true });
  }
  return renderGroups(groups, { withReason: true });
}
function apply(ctx, config = {}) {
  const extraUserPackages = new Set(config.extraUserPackages ?? []);
  const home = process.env.DSH_HOME || resolve(homedir(), ".dsh");
  for (const pkg of readUserDependencies(home)) extraUserPackages.add(pkg);
  ctx.commands.register({
    name: "plugin-audit",
    description: "\u6309\u6765\u6E90\uFF08\u5B98\u65B9 / \u81EA\u88C5\uFF09\u5206\u7EC4\u67E5\u770B\u5F53\u524D\u5DF2\u52A0\u8F7D\u7684\u63D2\u4EF6",
    input: { hint: "[user|official|<\u5173\u952E\u8BCD>]" },
    handler: ({ rawInput }) => {
      try {
        const { view, query } = parseInput(rawInput);
        const classified = snapshot(ctx, extraUserPackages);
        return { kind: "success", text: render(classified, view, query) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { kind: "error", text: `/plugin-audit \u8BFB\u53D6\u5931\u8D25\uFF1A${message}` };
      }
    }
  });
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
