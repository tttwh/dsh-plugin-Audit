# AGENTS.md

Guidance for AI coding agents (and human contributors) working in this repository.

## What this plugin does

`dsh-plugin-audit` distinguishes **official** DeepSeek Harness plugins (the
`@deepseek-ai/*` distribution) from **self-installed** plugins, and lets you
turn self-installed plugins on/off:

- a host-side cordis plugin that registers the `/plugin-audit` command
  (`src/index.ts`) and a `pluginAudit` Typert remote (`src/runtime.ts`) whose
  `toggle` writes the profile's `cordis.patch.yml` (persist) and calls
  `ctx.loader.update` (live, HMR-independent);
- a client-side Web Settings tab (id `source`) that groups the plugin list by
  origin and shows enable/disable buttons on self-installed plugins
  (`src/client/index.ts` + `src/client/SourceTab.tsx` + `src/client/remote.ts`).

## Layout

- `src/classify.ts` — pure, dependency-free origin classification. The single
  source of truth for the `official` / `user` / `builtin` rules. Do not
  duplicate these rules elsewhere.
- `src/patch.ts` — reads/writes the profile's `cordis.patch.yml` (line-level,
  zero-dependency) to persist `disable`/`enable` toggles.
- `src/toggle.ts` — shared toggle core (persist + live apply), used by both the
  command and the remote.
- `src/contract.ts` — hand-written Typert wire contract (zod schemas +
  `pluginAudit/toggle` invocation descriptor), shared host/client.
- `src/typert.ts` + `src/runtime.ts` — host manifest registration and the
  `PluginAuditRuntime` service (`executeToggle` is the unit-testable core).
- `src/render.ts` — text rendering for the `/plugin-audit` command output.
- `src/index.ts` — host cordis plugin (`name`, `inject = ['loader', 'commands', 'typert']`, `apply`).
- `src/client/*` — browser half; registers `settings.plugins.tab` id `source`.
- `cordis.patch.yml` — bundle patch that inserts this plugin into the tree.
- `dsh.plugin.json` — community plugin metadata manifest.
- `build.mjs` — esbuild build (host ESM + client CJS bundle wrapped in
  `window.__ModuleLoader__.load`), then `tsc` emits types. `zod` is bundled
  into both artifacts (same as dsh-at-file); `@deepseek-ai/*`, `cordis`, and
  `react` stay external (the dsh host supplies them at runtime).

## Commands

```sh
npm run build       # node build.mjs
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run check       # typecheck + test + build (needs pnpm)
```

## Conventions

- Keep `src/classify.ts` free of Node/DOM/React and dsh imports, so it can be
  unit-tested in isolation and shared by both host and client.
- Host code uses minimal structural types for `ctx` (rather than importing
  `@deepseek-ai/cordis`), so the package type-checks and bundles without a
  local dsh checkout. `@deepseek-ai/*` and `react` stay `external` in
  `build.mjs`; the dsh host supplies them at runtime.
- Comments explaining *why* (not just what) are expected; this repo is
  teaching-oriented.
- Do not modify any official `@deepseek-ai/*` bundle source or its dependency
  declarations. This plugin only adds a self-contained, reversible entry to a
  profile.
