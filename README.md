# dsh-plugin-audit

Group the DeepSeek Harness (dsh) plugin list by source — tell **official** plugins
(`@deepseek-ai/*`) apart from the ones **you installed yourself**, at a glance.
Community plugin, not affiliated with, endorsed by, or sponsored by DeepSeek.

## Features

- `/plugin-audit` command in the composer: lists plugins grouped by
  official / self-installed, with filtering.
- **Source** tab under Settings → Plugins: grouped cards with a source badge
  and a search box.

## Install

```sh
dsh plugin --profile web add https://github.com/tttwh/dsh-plugin-audit/archive/refs/heads/main.tar.gz
```

**Restart `dsh web`** after installing, then:

| Surface | Usage |
|---|---|
| Command | `/plugin-audit` (overview) · `/plugin-audit user` · `/plugin-audit official` · `/plugin-audit <keyword>` |
| Settings | Settings → Plugins → **Source** tab |

Uninstall: `dsh plugin --profile web remove dsh-plugin-audit` (restore on restart)

## Submission info (omdsh-dev/community items)

| # | Item | Value |
|---|---|---|
| 1 | Name & repo | `dsh-plugin-audit` · https://github.com/tttwh/dsh-plugin-audit |
| 2 | What & relation | A DeepSeek Harness plugin-management enhancement: group the plugin list by origin without modifying any official bundle |
| 3 | Install | See "Install" above |
| 4 | License & copyright | MIT License · Copyright (c) 2025 tttwh |
| 5 | Maintenance | Actively maintained (solo) · tttwh |
| 6 | Risks & limits | Read-only, does not change plugin loading; origin derived from package scope, see below |

## Development

```sh
npm install
npm run build        # emits lib/ (commit it: tarball install does not build)
npm run typecheck    # tsc --noEmit
npm test             # vitest run
```

## Known risks & limitations

- **Read-only**: never toggles, configures, or changes how plugins load.
- **Scope-based origin**: `@deepseek-ai/` → official, everything else →
  self-installed; edge cases are overridable via `extraUserPackages`
  (see `cordis.patch.yml`).
- **Compatibility**: relies on `loader`/`commands` (host) and
  `remote.pluginInventory`/`settings.plugins.tab` (client) from the default web
  profile.

Design rationale and source evidence: [DESIGN.md](DESIGN.md).
