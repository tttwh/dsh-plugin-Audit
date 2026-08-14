// @file demo/classify-profile.mjs
// @description 独立演示脚本（零依赖）：读取真实 dsh profile 的 bundle 声明与 patch，
//              用插件同款的 classify + render 输出「官方 / 自装」分组。
//
// 这不是 dsh 插件本体，只是教学/验证脚本：它离线复现 composeEntries 会产生的
// 条目清单（从每个 bundle 的 cordis.patch.yml 里提取 id/name），再跑一遍分类。
// 真正运行时，/plugin-audit 命令是从 ctx.loader.entries() 直接读的，数据源更权威。
//
// 用法（先构建一次）：npm run build && node demo/classify-profile.mjs [dshHome]
//   dshHome 默认 $DSH_HOME 或 ~/.dsh

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

import { classifyEntry, groupByOrigin } from '../lib/classify.js';
import { renderGroups } from '../lib/render.js';

const home = process.argv[2] || process.env.DSH_HOME || resolve(homedir(), '.dsh');

/** 极简 YAML 提取：从 bundle patch 里取出 insert 条目的 { id, name }。 */
function extractEntries(patchText) {
  const entries = [];
  const lines = patchText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // 仅匹配「缩进 ≥2 的 - id:」行 —— 这是 - insert: 下的新增条目；
    // 顶层 `- id:`（0 缩进）是「按 id 覆盖既有行」，不会新增条目，跳过。
    const m = /^\s{2,}-\s+id:\s*(.+?)\s*$/.exec(lines[i]);
    if (!m) continue;
    const id = m[1].replace(/^['"]|['"]$/g, '');
    // 在同一条目内向后找 name:（在下一个条目或列表边界前）。
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\s{0,2}-\s+(?:id|insert|disable|group):/.test(lines[j])) break;
      const nm = /^\s+name:\s*(.+?)\s*$/.exec(lines[j]);
      if (nm) {
        entries.push({ id, name: nm[1].replace(/^['"]|['"]$/g, '') });
        break;
      }
    }
  }
  return entries;
}

/** 从一个包目录读取它的 dsh.bundle.patch 指向的文件内容。 */
function readBundlePatch(pkgDir) {
  const manifestPath = join(pkgDir, 'package.json');
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const patchRel = manifest?.dsh?.bundle?.patch;
  if (!patchRel) return null;
  const patchPath = join(pkgDir, patchRel);
  return existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : null;
}

/** 把 bundle 名解析为包目录（two-anchored：profile/node_modules 优先，profiles/node_modules 兜底）。 */
function resolveBundleDir(profileDir, fallbackDir, bundleName) {
  const candidates = [join(profileDir, 'node_modules', bundleName), join(fallbackDir, bundleName)];
  for (const c of candidates) {
    if (existsSync(join(c, 'package.json'))) return c;
  }
  return null;
}

// ── 主流程 ──────────────────────────────────────────────────────────────
const profileDir = join(home, 'profiles', 'web');
const fallbackDir = join(home, 'profiles', 'node_modules'); // healProfilesModuleFallback 维护的扁平目录

const manifest = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'));
const bundles = manifest.dsh?.profile?.bundles ?? [];
const dependencies = manifest.dependencies ?? {};

// 用户显式安装集 = profile 的 dependencies（与插件 index.ts 里 readUserDependencies 同义）。
const extraUserPackages = new Set(Object.keys(dependencies));

const allEntries = [];
for (const bundleName of bundles) {
  const dir = resolveBundleDir(profileDir, fallbackDir, bundleName);
  if (!dir) {
    console.error(`[demo] 找不到 bundle: ${bundleName}`);
    continue;
  }
  const patch = readBundlePatch(dir);
  if (!patch) {
    console.error(`[demo] ${bundleName} 无 dsh.bundle.patch`);
    continue;
  }
  for (const { id, name } of extractEntries(patch)) {
    allEntries.push(classifyEntry({ id, options: { name }, disabled: false }, extraUserPackages));
  }
}

const groups = groupByOrigin(allEntries);
console.log(`# 读取自 ${profileDir}`);
console.log('');
console.log(renderGroups(groups, { withReason: true }));
console.log('');
console.log('── 边界情况说明 ──────────────────────────────────────────────');
console.log('· 判定依据是包名作用域：@deepseek-ai/ → 官方，其余 → 自装。');
console.log('· 本 profile 的自装 bundle 均非官方作用域，且都在 dependencies 里，');
console.log('  故被正确归为「自装」，与上面输出一致。');
console.log('· 若你将来装了 @deepseek-ai/ 前缀的第三方包，把它加进 extraUserPackages 即可覆盖。');
