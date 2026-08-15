# AGENTS.md

Guidance for AI coding agents (and human contributors) working in this repository.

## What this plugin does

`dsh-plugin-audit` distinguishes **official** DeepSeek Harness plugins (the
`@deepseek-ai/*` distribution) from **self-installed** plugins, via:

- a host-side cordis plugin that registers the `/plugin-audit` command
  (`src/index.ts`), and
- a client-side Web Settings tab (id `source`) that groups the plugin list by
  origin (`src/client/index.ts` + `src/client/SourceTab.tsx`).

## Layout

- `src/classify.ts` — pure, dependency-free origin classification. The single
  source of truth for the `official` / `user` / `builtin` rules. Do not
  duplicate these rules elsewhere.
- `src/patch.ts` — reads/writes the profile's `cordis.patch.yml` (line-level,
  zero-dependency) to persist `disable`/`enable` toggles.
- `src/render.ts` — text rendering for the `/plugin-audit` command output.
- `src/index.ts` — host cordis plugin (`name`, `inject = ['loader', 'commands']`, `apply`).
- `src/client/*` — browser half; registers `settings.plugins.tab` id `source`.
- `cordis.patch.yml` — bundle patch that inserts this plugin into the tree.
- `dsh.plugin.json` — community plugin metadata manifest.
- `build.mjs` — esbuild build (host ESM + client CJS bundle wrapped in
  `window.__ModuleLoader__.load`), then `tsc` emits types.

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
