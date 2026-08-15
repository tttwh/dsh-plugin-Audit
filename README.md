# dsh-plugin-audit

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH)
plugin-management enhancement: group the plugin list by source so you can tell
**official** plugins apart from the ones **you installed yourself** at a glance.

## Features

- **`/plugin-audit` command**: lists the currently loaded plugins grouped by
  official / self-installed, with `user` / `official` / keyword filtering;
- **Self-installed plugin toggles**: `/plugin-audit disable|enable <keyword>`
  turns your own plugins on/off (persisted to the profile's `cordis.patch.yml`,
  applied live via HMR, kept across restarts, reversible); official/builtin
  plugins are locked;
- **Source tab** in Settings → Plugins: grouped cards with a source badge and
  a search box (next to the built-in "Plugin list" tab);
- **Zero-dependency, unit-tested classification**: package-scope + explicit
  install-set rules (`@deepseek-ai/` → official, everything else →
  self-installed);
- **Fully reversible**: read-only, touches no official bundle, one command to
  uninstall.

## Quick start

Prerequisites: `pnpm`, the `dsh` CLI.

```sh
# Install
dsh plugin --profile web add https://github.com/tttwh/dsh-plugin-audit/archive/refs/heads/main.tar.gz
```

**Restart `dsh web`**, then:

- Type `/plugin-audit` in the composer, or
- Open Settings → Plugins → the **Source** tab.

## Commands

| Command | Purpose |
|---|---|
| `/plugin-audit` | Overview: self-installed one-by-one + official count |
| `/plugin-audit user` | Self-installed only |
| `/plugin-audit official` | Official only (full list) |
| `/plugin-audit <keyword>` | Filter by package / entry keyword |
| `/plugin-audit disable <keyword>` | Disable a matching **self-installed** plugin (persisted) |
| `/plugin-audit enable <keyword>` | Enable a matching **self-installed** plugin (persisted) |
| `dsh plugin --profile web remove dsh-plugin-audit` | Uninstall |

> **How toggles persist**: `disable/enable` writes a `- id: <entryId>` +
> `disabled: true` override into the profile's `cordis.patch.yml` (the user
> config layer). dsh's HMR watches that file (`watchUserPatches`), so the
> change applies live without a restart, survives restarts, and deleting the
> row restores the default.

## Configuration

Origin is derived from the package scope by default; edge cases (e.g. a
third-party package published under `@deepseek-ai/`) are overridden via
`extraUserPackages`. Override this plugin's row in the profile's
`cordis.patch.yml`:

```yaml
- id: plugin-audit
  config:
    extraUserPackages:
      - '@deepseek-ai/dsh-my-fork'   # force-classify as self-installed
```

## Repository layout

```text
dsh-plugin-audit/
  src/classify.ts        origin-classification pure function (single source of truth)
  src/index.ts           host: /plugin-audit command
  src/client/            Source tab (React)
  build.mjs              esbuild build (host ESM + client bundle)
  cordis.patch.yml       profile bundle patch (inserts this plugin)
  demo/                  demo & verification scripts (real-profile output)
```

## Docs

- [DESIGN.md](DESIGN.md) — design rationale and source evidence (why a new tab
  instead of modifying the official one; classification rules and edge cases)

## Related

- [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) — DeepSeek Harness official repo (DSH itself)
- [omdsh-dev/community](https://github.com/omdsh-dev/community) — community plugin submissions & collaboration hub

## License

[MIT](LICENSE) · Copyright (c) 2025 tttwh
