# dsh-plugin-audit

Audit the DeepSeek Harness plugin list by origin — tell **official** plugins
(`@deepseek-ai/*`) apart from **self-installed** ones at a glance.

- **Two surfaces**: ① a `/plugin-audit` command in the composer; ② a **Source**
  tab under Settings → Plugins.
- **Classification**: a pure, dependency-free, unit-tested function built on a
  "package scope + explicit install set" rule.
- **Reversible**: `dsh plugin --profile web remove dsh-plugin-audit` removes it
  entirely without touching any official bundle.

> This is a community plugin. It is not affiliated with, endorsed by, or
> sponsored by DeepSeek.

---

## Submission info (omdsh-dev/community items)

| # | Item | Value |
|---|---|---|
| 1 | Name & repo | `dsh-plugin-audit` · <https://github.com/tttwh/dsh-plugin-audit> |
| 2 | What & relation | A DeepSeek Harness plugin-management enhancement: group the plugin list by origin without modifying any official bundle |
| 3 | Install | `dsh plugin --profile web add https://github.com/tttwh/dsh-plugin-audit/archive/refs/heads/main.tar.gz` |
| 4 | License & copyright | MIT License · Copyright (c) 2025 tttwh |
| 5 | Maintenance | Actively maintained (solo) · Maintainer: tttwh |
| 6 | Risks & limits | Read-only; origin derived from package scope, see "Known risks" below |

---

## What it does

DeepSeek Harness ships dozens of official `@deepseek-ai/*` plugins that sit
mixed together with plugins installed via `dsh plugin add`. This plugin:

1. Registers the `/plugin-audit` command (Web composer + any interactive UI
   adapter) that prints a grouped official/self-installed list, with filtering.
2. Adds a **Source** tab in Settings → Plugins that renders the list grouped by
   origin, with source badges and a search box.

**Example output** (real profile, `node demo/classify-profile.mjs`):

```
插件来源分类（官方 vs 自装）
总计 134：官方 129 · 自装 5 · 内置 0

── 自装插件（5）──
  [已启用] dsh-at-file · 自装 · entry=dsh-at-file · …
  [已启用] @omdsh-dev/dsh-genui · 自装 · entry=genui · …
  [已启用] @dsh-external/dsh-automation · 自装 · entry=dsh-automation · …
  [已启用] dsh-better-sidebar · 自装 · entry=better-sidebar · …
  [已启用] @liustack/modlens · 自装 · entry=modlens · …

── 官方插件（129）──
  全部位于 @deepseek-ai/ 官方发行作用域（共 129 个）。
```

---

## Install

Requires `pnpm` and the `dsh` CLI.

```sh
# Direct GitHub tarball install (same distribution path as dsh-at-file)
dsh plugin --profile web add https://github.com/tttwh/dsh-plugin-audit/archive/refs/heads/main.tar.gz
```

Local development:

```sh
cd dsh-plugin-audit
dsh plugin --profile web add link:$(pwd)
```

Restart the web server (or let HMR pick it up), then run `/plugin-audit` in the
composer or open Settings → Plugins → Source.

---

## Usage

| Surface | How |
|---|---|
| Command | `/plugin-audit` · `/plugin-audit user` · `/plugin-audit official` · `/plugin-audit <query>` |
| Settings | Settings → Plugins → **Source** tab (grouped cards + source badge + search) |

---

## Development

```sh
npm install
npm run build       # esbuild → lib/index.js (host) + lib/client.js (client) + lib/classify.js, lib/render.js
npm run typecheck   # tsc --noEmit
npm test            # vitest run
```

> Commit the built `lib/`: the GitHub tarball install (`dsh plugin add <tarball>`)
> does not build on install — it reads the committed `lib/` directly.

---

## Uninstall

```sh
dsh plugin --profile web remove dsh-plugin-audit
```

Fully restores the original state.

---

## Design notes

### 1. Can the Web plugin-list page be extended to group/filter by source?

You can **add a new tab** that groups/filters, but you cannot restyle the
official built-in "Plugin list" tab. Evidence:

- `@deepseek-ai/dsh-client-ui-settings-plugins` declares `settings.plugins.tab`
  as a root **list slot** — any plugin can register its own tab.
- `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` (the official list tab)
  lists **grouping by source** under Known Limitations, and never classifies
  entries by string shape.
- `@deepseek-ai/dsh-api-remotes` already mounts `pluginInventory/list`, which
  returns `entryId / moduleName / enabled / fiberPhase` per entry.
- `@deepseek-ai/dsh-host-plugin-inventory` exposes **no provenance** (which
  bundle/profile introduced an entry), so origin is derived from `moduleName`.

### 2. Alternative approaches

| Approach | Surface | Pros | Costs |
|---|---|---|---|
| `/plugin-audit` command (this plugin) | Web composer | Reads `ctx.loader.entries()` (most authoritative); zero-build host side; fully reversible | Not in Settings; no adapter for non-interactive headless |
| Source tab (this plugin's client half) | Settings → Plugins | Exactly in Settings | Needs an esbuild browser bundle; scope rule only |
| CLI command | Terminal | Works without UI | Needs `cmdlineArgs` + commander + exit control |

### 3. Classification rule & edge cases

The sole authoritative signal is the entry's module specifier (package name).
Rules, first match wins:

1. `cordis:` prefix → builtin;
2. name in the "explicit install set" (profile `dependencies` ∪
   `config.extraUserPackages`) → self-installed (**overrides scope**);
3. `@deepseek-ai/` prefix → official;
4. anything else → self-installed.

Edge cases: a third-party package published under `@deepseek-ai/` is corrected
by rule 2; a new plugin added by an official bundle upgrade is still in the
scope, so it is automatically official (no allow-list to maintain).

---

## Known risks & limitations

- **Read-only**: never toggles, configures, or changes how plugins load.
- **Scope-based**: origin is derived from the `@deepseek-ai/` scope because the
  host exposes no bundle provenance; use `extraUserPackages` for the rare
  scope-collision case.
- **Multi-profile**: the host scans `$DSH_HOME/profiles/*` dependencies (exact
  for single-profile setups); use `extraUserPackages` for multi-profile.
- **Source tab** uses the scope rule only (it cannot read profile dependencies).
- **Compatibility**: relies on `loader`/`commands` (host) and
  `remote.pluginInventory`/`settings.plugins.tab` (client) from the default web
  bundle composition.
