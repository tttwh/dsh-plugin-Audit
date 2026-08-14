/**
 * 单文件 client + ESM host 构建，仿照官方社区插件 dsh-at-file 的 build.mjs。
 *
 * - host 半边：ESM for Node，把 classify/render 一起打进 lib/index.js；
 *   @deepseek-ai/cordis 与 @deepseek-ai/dsh-* 保持 external（profile 的 node_modules
 *   与 app 自己提供它们）。
 * - client 半边：CJS for browser，用 banner/footer 包成 ModuleLoader 工厂握手
 *   （window.__ModuleLoader__.load({ id, factory })）；react 与 @deepseek-ai/dsh-*
 *   保持 external。
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('lib', { recursive: true });

// 官方/运行时依赖全部 external：这些由 dsh 宿主环境提供，不进插件包。
const dshExternal = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-*'];

// 1) host 半边：ESM，跑在 Node 里。
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: true,
  external: dshExternal,
  logLevel: 'info',
});

// 2) client 半边：CJS，跑在浏览器里，包进 __ModuleLoader__.load 握手。
await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  jsx: 'automatic',
  external: [
    ...dshExternal,
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
    'scheduler',
  ],
  banner: {
    js: "window.__ModuleLoader__.load({ id: 'dsh-plugin-audit', factory: (require) => { var module = { exports: {} }; var exports = module.exports;",
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
});

// 3) 独立产出纯逻辑模块（classify / render），供本仓库的 demo 与单测直接 import。
//    它们与 index.js 里的内联副本一致（classify 是单一事实来源，esbuild 只做转译）。
for (const mod of ['classify', 'render']) {
  await build({
    entryPoints: [`src/${mod}.ts`],
    outfile: `lib/${mod}.js`,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: ['es2022'],
    sourcemap: true,
    logLevel: 'info',
  });
}

// 4) 用 tsc 生成 .d.ts 类型（写进 lib/types），供 exports 里的 types 指向。
import { execFileSync } from 'node:child_process';
execFileSync('node_modules/.bin/tsc', ['-p', 'tsconfig.json'], { stdio: 'inherit' });
