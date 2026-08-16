// @file src/patch.ts
// @description 读写 profile 的 cordis.patch.yml，实现插件的「持久化开关」。
//
// 为什么写在 cordis.patch.yml 而不是直接改 loader：
//   - loader.update() 会写回 profile 的 cordis.yml，但 cordis.yml 是组合产物，
//     每次 boot 被 prepareProfile 覆盖成空树，运行时改动会丢；
//   - cordis.patch.yml 是用户配置层（watchUserPatches 监听它，HMR 即时重载），
//     写 `- id: <entryId>` + `disabled: true` 覆盖行即可持久化、重启保留、可逆。
//
// 实现策略：行级文本操作，不引入 js-yaml——
//   - 保留文件头的注释（模板注释是给用户看的说明）；
//   - 只增删目标条目的 disabled 覆盖行，不动其它字段；
//   - 只处理「顶层 - id:」覆盖行（id-targeted override），不碰 - insert: 块。

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 顶层条目行的正则：`- id: xxx`（0 缩进）。 */
const ROW_START = /^-\s+id:\s*(.+?)\s*$/;
/** 条目内 disabled 字段行：`  disabled: true|false`（≥2 缩进）。 */
const DISABLED_LINE = /^(\s+)disabled:\s*(true|false)\s*$/;

/** 判断 id 是否需要 YAML 引号（裸写 vs 单引号）。 */
function yamlScalar(value: string): string {
  return /^[A-Za-z0-9_.-]+$/.test(value) ? value : `'${value.replace(/'/g, "''")}'`;
}

/** 剥掉 YAML 标量两端的引号，用于和 loader 的 entryId 比较。 */
function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export interface PatchDocument {
  /** 文件开头的注释行（原样保留）。 */
  header: string[];
  /** 注释之后的正文行（含 `[]` 或条目列表）。 */
  body: string[];
}

/** 把文件文本拆成「注释头 + 正文」。 */
export function splitPatch(text: string): PatchDocument {
  const lines = text.split('\n');
  const header: string[] = [];
  const body: string[] = [];
  let inHeader = true;
  for (const line of lines) {
    if (inHeader && (line.trim() === '' || line.startsWith('#'))) {
      header.push(line);
    } else {
      inHeader = false;
      body.push(line);
    }
  }
  return { header, body };
}

/** 找顶层 `- id: <id>` 的行索引（0 缩进），找不到返回 -1。 */
export function findRow(body: string[], entryId: string): number {
  for (let i = 0; i < body.length; i++) {
    const match = ROW_START.exec(body[i]);
    if (match && unquote(match[1]) === entryId) return i;
  }
  return -1;
}

/** 某条目行之后的条目区间（到下一个顶层 - id: 或结尾）。 */
export function rowRange(body: string[], start: number): { start: number; end: number } {
  let end = body.length;
  for (let i = start + 1; i < body.length; i++) {
    if (ROW_START.test(body[i])) {
      end = i;
      break;
    }
  }
  return { start, end };
}

/** 在一个条目区间内找 disabled 字段行的索引；返回 { index, disabled } 或 null。 */
function findDisabled(body: string[], start: number, end: number): { index: number; disabled: boolean } | null {
  for (let i = start + 1; i < end; i++) {
    const match = DISABLED_LINE.exec(body[i]);
    if (match) return { index: i, disabled: match[2] === 'true' };
  }
  return null;
}

/** 一个条目区间是否只剩 id 行（没有其它字段）。 */
function rowIsBare(body: string[], start: number, end: number): boolean {
  for (let i = start + 1; i < end; i++) {
    if (body[i].trim() !== '') return false;
  }
  return true;
}

/** 移除 body 里孤立的 `[]` 行与尾部空行（追加条目前清理占位与结尾换行残渣）。 */
function stripEmptyArray(body: string[]): string[] {
  const out = body.filter((line) => line.trim() !== '[]');
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
  return out;
}

/**
 * 移除 v0.2/v0.3 遗留的 `- id: 'include:<id>'` 死行（迁移逻辑）。
 *
 * 旧版本把 Loader 树内的完整 id（含 `include:` 路径前缀）误当 patch 行 id 写入，
 * 而 patch 层按配置行自身的 `id` 字段匹配（见 classify.ts 的 configId 注释），
 * 这类行启动时被 applyEntryPatches 判「找不到条目」跳过并打 warning。
 * 对目标 id 做任意一次开关时顺手清掉，避免每次 boot 的噪音 warning。
 */
function removeLegacyRows(body: string[], entryId: string): string[] {
  const legacyId = `include:${entryId}`;
  const next = [...body];
  for (let i = next.length - 1; i >= 0; i--) {
    const match = ROW_START.exec(next[i]);
    if (match && unquote(match[1]) === legacyId) {
      const { start, end } = rowRange(next, i);
      next.splice(start, end - start);
    }
  }
  return next;
}

/**
 * 对正文执行一次开关操作（纯函数，不碰文件）。
 *
 * @param body 原正文行
 * @param entryId 目标条目在配置行里的原始 id（不带 loader 路径前缀，如 `ssh`）
 * @param disabled 目标状态
 * @returns 新正文 + 是否发生变化
 */
export function applyToggle(body: string[], entryId: string, disabled: boolean): { body: string[]; changed: boolean } {
  // 先清理该 id 的遗留死行（v0.4 迁移）；若因此产生变化，算一次真实变更。
  const cleaned = removeLegacyRows(body, entryId);
  const row = findRow(cleaned, entryId);
  const next = [...cleaned];

  if (row === -1) {
    // 该 id 没有任何顶层覆盖行。
    if (!disabled) {
      // 没有 disabled 行 = 已启用；但若顺手清掉了遗留死行，仍要写回。
      return cleaned.length === body.length ? { body, changed: false } : { body: cleaned, changed: true };
    }
    const clean = stripEmptyArray(next);
    clean.push(`- id: ${yamlScalar(entryId)}`, '  disabled: true');
    return { body: clean, changed: true };
  }

  const { start, end } = rowRange(next, row);
  const field = findDisabled(next, start, end);

  if (field) {
    if (field.disabled === disabled) {
      return cleaned.length === body.length ? { body, changed: false } : { body: cleaned, changed: true };
    }
    if (disabled) {
      // 把 disabled: false 改成 true
      next[field.index] = `  disabled: true`;
      return { body: next, changed: true };
    }
    // enable：删除 disabled 行；若条目只剩 id 行则整块删除
    next.splice(field.index, 1);
    const bare = rowIsBare(next, start, end - 1);
    if (bare) next.splice(start, 1);
    return { body: next, changed: true };
  }

  // 有条目但无 disabled 字段
  if (!disabled) {
    return cleaned.length === body.length ? { body, changed: false } : { body: cleaned, changed: true };
  }
  next.splice(start + 1, 0, '  disabled: true');
  return { body: next, changed: true };
}

/** 序列化回文件文本（保留注释头 + 正文 + 末尾换行）。 */
export function serializePatch(doc: PatchDocument, body: string[]): string {
  const all = [...doc.header, ...body];
  // 去掉结尾多余空行，补一个换行
  while (all.length > 0 && all[all.length - 1].trim() === '') all.pop();
  return all.join('\n') + '\n';
}

/** 从 loader 的 include 根条目反推 profile 目录里的 cordis.patch.yml 路径。 */
export function profilePatchPath(includeConfigPath: string | undefined): string | null {
  if (typeof includeConfigPath !== 'string' || includeConfigPath === '') return null;
  const filename = includeConfigPath.startsWith('file:')
    ? fileURLToPath(includeConfigPath)
    : includeConfigPath;
  return join(dirname(filename), 'cordis.patch.yml');
}

export interface ToggleResult {
  changed: boolean;
  path: string;
  message: string;
}

/**
 * 对 profile 的 cordis.patch.yml 执行一次持久化开关。
 *
 * @param patchPath cordis.patch.yml 的绝对路径
 * @param entryId 目标条目的配置行原始 id（不带 loader 路径前缀，如 `ssh`）
 * @param disabled 目标状态（true=停用，false=启用）
 */
export function togglePatchFile(patchPath: string, entryId: string, disabled: boolean): ToggleResult {
  const existed = existsSync(patchPath);
  const source = existed ? readFileSync(patchPath, 'utf8') : '# Your patch layer for this dsh profile\n[]\n';
  const doc = splitPatch(source);
  const { body, changed } = applyToggle(doc.body, entryId, disabled);
  if (!changed) {
    return {
      changed: false,
      path: patchPath,
      message: disabled ? `条目 ${entryId} 已是停用状态` : `条目 ${entryId} 已是启用状态`,
    };
  }
  const text = serializePatch(doc, body);
  // 原子写：先写 .tmp 再 rename（与 include 的 _writeFile 同款，避免半截文件触发 HMR 误载）
  writeFileSync(`${patchPath}.tmp`, text, 'utf8');
  renameSync(`${patchPath}.tmp`, patchPath);
  return {
    changed: true,
    path: patchPath,
    message: disabled
      ? `已停用 ${entryId}（已写入 ${patchPath}，重启后保持）`
      : `已启用 ${entryId}（已写入 ${patchPath}，重启后保持）`,
  };
}
