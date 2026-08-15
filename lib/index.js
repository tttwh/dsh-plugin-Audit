// src/index.ts
import { readFileSync as readFileSync2, existsSync as existsSync2, readdirSync } from "node:fs";
import { join as join2, resolve } from "node:path";
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

// src/patch.ts
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var ROW_START = /^-\s+id:\s*(.+?)\s*$/;
var DISABLED_LINE = /^(\s+)disabled:\s*(true|false)\s*$/;
function yamlScalar(value) {
  return /^[A-Za-z0-9_.-]+$/.test(value) ? value : `'${value.replace(/'/g, "''")}'`;
}
function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'") || trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
function splitPatch(text) {
  const lines = text.split("\n");
  const header = [];
  const body = [];
  let inHeader = true;
  for (const line of lines) {
    if (inHeader && (line.trim() === "" || line.startsWith("#"))) {
      header.push(line);
    } else {
      inHeader = false;
      body.push(line);
    }
  }
  return { header, body };
}
function findRow(body, entryId) {
  for (let i = 0; i < body.length; i++) {
    const match = ROW_START.exec(body[i]);
    if (match && unquote(match[1]) === entryId) return i;
  }
  return -1;
}
function rowRange(body, start) {
  let end = body.length;
  for (let i = start + 1; i < body.length; i++) {
    if (ROW_START.test(body[i])) {
      end = i;
      break;
    }
  }
  return { start, end };
}
function findDisabled(body, start, end) {
  for (let i = start + 1; i < end; i++) {
    const match = DISABLED_LINE.exec(body[i]);
    if (match) return { index: i, disabled: match[2] === "true" };
  }
  return null;
}
function rowIsBare(body, start, end) {
  for (let i = start + 1; i < end; i++) {
    if (body[i].trim() !== "") return false;
  }
  return true;
}
function stripEmptyArray(body) {
  const out = body.filter((line) => line.trim() !== "[]");
  while (out.length > 0 && out[out.length - 1].trim() === "") out.pop();
  return out;
}
function applyToggle(body, entryId, disabled) {
  const row = findRow(body, entryId);
  const next = [...body];
  if (row === -1) {
    if (!disabled) return { body, changed: false };
    const clean = stripEmptyArray(next);
    clean.push(`- id: ${yamlScalar(entryId)}`, "  disabled: true");
    return { body: clean, changed: true };
  }
  const { start, end } = rowRange(next, row);
  const field = findDisabled(next, start, end);
  if (field) {
    if (field.disabled === disabled) return { body, changed: false };
    if (disabled) {
      next[field.index] = `  disabled: true`;
      return { body: next, changed: true };
    }
    next.splice(field.index, 1);
    const bare = rowIsBare(next, start, end - 1);
    if (bare) next.splice(start, 1);
    return { body: next, changed: true };
  }
  if (!disabled) return { body, changed: false };
  next.splice(start + 1, 0, "  disabled: true");
  return { body: next, changed: true };
}
function serializePatch(doc, body) {
  const all = [...doc.header, ...body];
  while (all.length > 0 && all[all.length - 1].trim() === "") all.pop();
  return all.join("\n") + "\n";
}
function profilePatchPath(includeConfigPath) {
  if (typeof includeConfigPath !== "string" || includeConfigPath === "") return null;
  const filename = includeConfigPath.startsWith("file:") ? fileURLToPath(includeConfigPath) : includeConfigPath;
  return join(dirname(filename), "cordis.patch.yml");
}
function togglePatchFile(patchPath, entryId, disabled) {
  const existed = existsSync(patchPath);
  const source = existed ? readFileSync(patchPath, "utf8") : "# Your patch layer for this dsh profile\n[]\n";
  const doc = splitPatch(source);
  const { body, changed } = applyToggle(doc.body, entryId, disabled);
  if (!changed) {
    return {
      changed: false,
      path: patchPath,
      message: disabled ? `\u6761\u76EE ${entryId} \u5DF2\u662F\u505C\u7528\u72B6\u6001` : `\u6761\u76EE ${entryId} \u5DF2\u662F\u542F\u7528\u72B6\u6001`
    };
  }
  const text = serializePatch(doc, body);
  writeFileSync(`${patchPath}.tmp`, text, "utf8");
  renameSync(`${patchPath}.tmp`, patchPath);
  return {
    changed: true,
    path: patchPath,
    message: disabled ? `\u5DF2\u505C\u7528 ${entryId}\uFF08\u5DF2\u5199\u5165 ${patchPath}\uFF0C\u91CD\u542F\u540E\u4FDD\u6301\uFF09` : `\u5DF2\u542F\u7528 ${entryId}\uFF08\u5DF2\u5199\u5165 ${patchPath}\uFF0C\u91CD\u542F\u540E\u4FDD\u6301\uFF09`
  };
}

// src/index.ts
var name = "plugin-audit";
var inject = ["loader", "commands"];
function readUserDependencies(home) {
  const set = /* @__PURE__ */ new Set();
  if (!home) return set;
  const profilesDir = join2(home, "profiles");
  if (!existsSync2(profilesDir)) return set;
  try {
    for (const dirent of readdirSync(profilesDir, { withFileTypes: true })) {
      if (!dirent.isDirectory() && !dirent.isSymbolicLink()) continue;
      const manifestPath = join2(profilesDir, dirent.name, "package.json");
      if (!existsSync2(manifestPath)) continue;
      try {
        const manifest = JSON.parse(readFileSync2(manifestPath, "utf8"));
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
  if (input === "") return { action: "view", view: "summary", query: "" };
  if (/^user$/i.test(input)) return { action: "view", view: "user", query: "" };
  if (/^official$/i.test(input)) return { action: "view", view: "official", query: "" };
  const toggle = /^(disable|enable)\s+(.+)$/i.exec(input);
  if (toggle) {
    return {
      action: toggle[1].toLowerCase() === "disable" ? "disable" : "enable",
      view: "query",
      query: toggle[2].toLocaleLowerCase()
    };
  }
  return { action: "view", view: "query", query: input.toLocaleLowerCase() };
}
function matches(entry, query) {
  return entry.moduleName.toLocaleLowerCase().includes(query) || entry.entryId.toLocaleLowerCase().includes(query);
}
function snapshot(ctx, extraUserPackages) {
  const classified = [];
  for (const entry of ctx.loader.entries()) {
    if (entry.options.group) continue;
    classified.push(classifyEntry(entry, extraUserPackages));
  }
  return classified;
}
function findProfilePatchPath(ctx) {
  for (const entry of ctx.loader.entries()) {
    if (entry.options.name !== "cordis:include") continue;
    const config = entry.options.config;
    if (config?.path) return profilePatchPath(config.path);
  }
  return null;
}
async function runToggle(ctx, classified, query, disabled, patchPath) {
  const candidates = classified.filter((e) => e.origin === "user" && matches(e, query));
  const verb = disabled ? "\u505C\u7528" : "\u542F\u7528";
  if (candidates.length === 0) {
    const officialHit = classified.filter((e) => e.origin !== "user" && matches(e, query));
    const hint = officialHit.length > 0 ? `\u5339\u914D\u5230 ${officialHit.length} \u4E2A\u975E\u81EA\u88C5\u63D2\u4EF6\uFF08${officialHit.map((e) => e.entryId).join("\u3001")}\uFF09\u3002\u5B89\u5168\u8FB9\u754C\uFF1A\u53EA\u80FD\u64CD\u4F5C\u81EA\u88C5\u63D2\u4EF6\u3002` : "\u6CA1\u6709\u5339\u914D\u5230\u4EFB\u4F55\u81EA\u88C5\u63D2\u4EF6\u3002";
    return { kind: "error", text: `${verb}\u5931\u8D25\uFF1A${hint}` };
  }
  if (candidates.length > 1) {
    const list = candidates.map((e) => `  ${e.entryId} (${e.moduleName})`).join("\n");
    return {
      kind: "error",
      text: `\u5339\u914D\u5230 ${candidates.length} \u4E2A\u63D2\u4EF6\uFF0C\u8BF7\u7528\u5B8C\u6574 entry id \u6216\u66F4\u7CBE\u786E\u7684\u5173\u952E\u8BCD\uFF1A
${list}`
    };
  }
  const target = candidates[0];
  if (target.entryId === "plugin-audit" || target.moduleName === "dsh-plugin-audit") {
    return { kind: "error", text: `\u4E0D\u80FD${verb}\u672C\u63D2\u4EF6\u81EA\u8EAB\uFF08\u4F1A\u4E2D\u65AD\u547D\u4EE4\u6267\u884C\uFF09` };
  }
  if (patchPath === null) {
    return { kind: "error", text: `${verb} ${target.entryId} \u5931\u8D25\uFF1A\u627E\u4E0D\u5230 profile \u7684 cordis.patch.yml` };
  }
  try {
    const result = togglePatchFile(patchPath, target.entryId, disabled);
    await ctx.loader.update(target.entryId, { disabled });
    return {
      kind: "success",
      text: `${verb} ${target.entryId}\uFF08${target.moduleName}\uFF09\uFF1A${result.message}\uFF0C\u8FD0\u884C\u65F6\u5DF2\u751F\u6548`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: "error", text: `${verb} ${target.entryId} \u5931\u8D25\uFF1A${message}` };
  }
}
function render(classified, parsed) {
  const { view, query } = parsed;
  const groups = groupByOrigin(classified);
  if (view === "user") {
    return renderGroups({ official: [], user: groups.user, builtin: [] }, { withReason: true });
  }
  if (view === "official") {
    return renderGroups({ official: groups.official, user: [], builtin: [] }, { listOfficial: true });
  }
  if (view === "query") {
    const matched = classified.filter((e) => matches(e, query));
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
    description: "\u6309\u6765\u6E90\uFF08\u5B98\u65B9 / \u81EA\u88C5\uFF09\u5206\u7EC4\u67E5\u770B\u63D2\u4EF6\uFF1Bdisable/enable \u63A7\u5236\u81EA\u88C5\u63D2\u4EF6\u5F00\u5173",
    input: { hint: "[user|official|<\u5173\u952E\u8BCD>|disable <\u5173\u952E\u8BCD>|enable <\u5173\u952E\u8BCD>]" },
    handler: async ({ rawInput }) => {
      try {
        const parsed = parseInput(rawInput);
        const classified = snapshot(ctx, extraUserPackages);
        if (parsed.action === "disable" || parsed.action === "enable") {
          const patchPath = findProfilePatchPath(ctx);
          return await runToggle(ctx, classified, parsed.query, parsed.action === "disable", patchPath);
        }
        return { kind: "success", text: render(classified, parsed) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { kind: "error", text: `/plugin-audit \u6267\u884C\u5931\u8D25\uFF1A${message}` };
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
