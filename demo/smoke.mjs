// @file demo/smoke.mjs
// @description 冒烟测试：用最小 mock 的 ctx，端到端验证 host 插件的
//              apply → 注册 /plugin-audit → 查看/开关 → 写 patch 文件 链路。
//              不依赖真实 dsh 环境（patch 文件用临时目录）。
// 运行（先构建一次）：npm run build && node demo/smoke.mjs

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { apply } from '../lib/index.js';

// ── 临时「profile」：cordis.yml（占位）+ cordis.patch.yml（模板）─────────────
const dir = mkdtempSync(join(tmpdir(), 'dsh-audit-smoke-'));
writeFileSync(join(dir, 'cordis.yml'), '[]\n', 'utf8');
writeFileSync(
  join(dir, 'cordis.patch.yml'),
  `# Your patch layer for this dsh profile
[]
`,
  'utf8',
);

const patchPath = join(dir, 'cordis.patch.yml');
const includeEntry = {
  id: 'include',
  options: { name: 'cordis:include', config: { path: pathToFileURL(join(dir, 'cordis.yml')).href } },
};

// ── mock ctx：loader + commands ─────────────────────────────────────────────
const fakeEntries = [
  { id: 'timer', options: { name: '@deepseek-ai/cordis-plugin-timer' }, disabled: false },
  { id: 'dsh-at-file', options: { name: 'dsh-at-file' }, disabled: false },
  { id: 'modlens', options: { name: '@liustack/modlens' }, disabled: false },
  includeEntry, // include 根条目：用于反推 profile 目录
];

const registered = [];
const updates = []; // 记录 ctx.loader.update 的调用（即时生效验证）
const ctx = {
  loader: {
    entries: () => fakeEntries[Symbol.iterator](),
    update: async (id, opts) => { updates.push({ id, opts }); },
  },
  commands: { register: (def) => { registered.push(def); } },
};

apply(ctx, {});
const run = async (rawInput) => registered[0].handler({ rawInput });

// ── 查看 ────────────────────────────────────────────────────────────────────
const view = await run('');
console.log('── /plugin-audit 概览（mock）──');
console.log(view.text.split('\n').slice(0, 5).join('\n'));
console.log('');

// ── disable 自装插件 modlens ────────────────────────────────────────────────
const off = await run('disable modlens');
console.log('── /plugin-audit disable modlens ──');
console.log(off.text);
console.log('patch 文件内容:');
console.log(readFileSync(patchPath, 'utf8').replace(/\n$/, ''));
console.log('loader.update 调用:', JSON.stringify(updates));
console.log('');

// ── 安全边界：disable 官方插件 timer 应被拒绝 ───────────────────────────────
const forbidden = await run('disable timer');
console.log('── /plugin-audit disable timer（应拒绝）──');
console.log(forbidden.text);
console.log('');

// ── enable 恢复 ─────────────────────────────────────────────────────────────
const on = await run('enable modlens');
console.log('── /plugin-audit enable modlens ──');
console.log(on.text);
console.log('patch 文件内容（应不含 modlens）:');
console.log(readFileSync(patchPath, 'utf8').replace(/\n$/, ''));
console.log('loader.update 调用:', JSON.stringify(updates));

rmSync(dir, { recursive: true, force: true });
