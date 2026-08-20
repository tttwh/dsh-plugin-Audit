// @file tests/patch.test.ts
// @description patch.ts 的单元测试：cordis.patch.yml 的解析与 disable/enable 增删。

import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { applyToggle, profileDirectory, serializePatch, splitPatch, togglePatchFile } from '../src/patch';

/** 模板 patch 文件（与 dsh profile 初始化时一致）。 */
const TEMPLATE = `# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries (id-targeted config
# overrides, disables, and insert lists; \`!!js\` expressions allowed).
[]
`;

describe('profileDirectory', () => {
  it('正确解析 Windows 反斜杠路径', () => {
    expect(profileDirectory('C:\\Users\\demo\\.dsh\\profiles\\web\\cordis.patch.yml')).toBe(
      'C:\\Users\\demo\\.dsh\\profiles\\web',
    );
  });

  it('null 保持 null', () => {
    expect(profileDirectory(null)).toBeNull();
  });
});

describe('splitPatch', () => {
  it('分离注释头与正文', () => {
    const { header, body } = splitPatch(TEMPLATE);
    expect(header.every((l) => l.trim() === '' || l.startsWith('#'))).toBe(true);
    expect(body.join('\n').trim()).toBe('[]');
  });
});

describe('applyToggle', () => {
  it('disable 不存在的条目：清掉 [] 并追加覆盖行', () => {
    const { body } = splitPatch(TEMPLATE);
    const { body: next, changed } = applyToggle(body, 'modlens', true);
    expect(changed).toBe(true);
    expect(next.join('\n')).toContain('- id: modlens\n  disabled: true');
    expect(next.join('\n')).not.toContain('[]');
  });

  it('enable 不存在的条目：不变（没有 disabled 行就是已启用）', () => {
    const { body } = splitPatch(TEMPLATE);
    const { body: next, changed } = applyToggle(body, 'modlens', false);
    expect(changed).toBe(false);
    expect(next).toEqual(body);
  });

  it('disable 已禁用的条目：不变', () => {
    const text = `# header\n- id: modlens\n  disabled: true\n`;
    const { body } = splitPatch(text);
    const { changed } = applyToggle(body, 'modlens', true);
    expect(changed).toBe(false);
  });

  it('enable 已禁用的条目：删除 disabled 行；块变空则整块删除', () => {
    const text = `# header\n- id: modlens\n  disabled: true\n`;
    const { body } = splitPatch(text);
    const { body: next, changed } = applyToggle(body, 'modlens', false);
    expect(changed).toBe(true);
    expect(next.join('\n')).not.toContain('modlens');
  });

  it('disable 有 disabled: false 的条目：改成 true', () => {
    const text = `# header\n- id: modlens\n  disabled: false\n`;
    const { body } = splitPatch(text);
    const { body: next, changed } = applyToggle(body, 'modlens', true);
    expect(changed).toBe(true);
    expect(next.join('\n')).toContain('  disabled: true');
    expect(next.join('\n')).not.toContain('disabled: false');
  });

  it('多条目时只改目标条目', () => {
    const text = `# header\n- id: dsh-at-file\n  config:\n    maxFileBytes: 100\n- id: modlens\n`;
    const { body } = splitPatch(text);
    const { body: next, changed } = applyToggle(body, 'modlens', true);
    expect(changed).toBe(true);
    const joined = next.join('\n');
    expect(joined).toContain('- id: dsh-at-file\n  config:\n    maxFileBytes: 100');
    expect(joined).toContain('- id: modlens\n  disabled: true');
  });

  it('回归 v0.4：顺带清除遗留的 `- id: include:<id>` 死行（旧版误写带前缀 id）', () => {
    // 模拟 v0.2/v0.3 的遗留产物：把 Loader 树内完整 id 误当成 patch 行 id 写入。
    // patch 层按配置行自身 id 匹配，这类行启动时被跳过；对目标 id 开关时顺手清理。
    const text = `# header\n- id: 'include:pet'\n  disabled: true\n`;
    const { body } = splitPatch(text);
    const { body: next, changed } = applyToggle(body, 'pet', true);
    expect(changed).toBe(true);
    const joined = next.join('\n');
    expect(joined).not.toContain('include:pet');
    expect(joined).toContain('- id: pet\n  disabled: true');
  });

  it('回归 v0.4：enable 时同样清理遗留死行（死行本身就是一次变更）', () => {
    const text = `# header\n- id: 'include:pet'\n  disabled: true\n`;
    const { body } = splitPatch(text);
    const { body: next, changed } = applyToggle(body, 'pet', false);
    expect(changed).toBe(true);
    expect(next.join('\n')).not.toContain('include:pet');
  });
});

describe('serializePatch', () => {
  it('保留注释头并以换行结尾', () => {
    const { header, body } = splitPatch(TEMPLATE);
    const { body: next } = applyToggle(body, 'modlens', true);
    const text = serializePatch({ header, body: next }, next);
    expect(text.startsWith('# Your patch layer')).toBe(true);
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('- id: modlens\n  disabled: true');
  });
});

describe('togglePatchFile（真实临时文件）', () => {
  it('disable → 写文件 → enable → 恢复原状', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-audit-test-'));
    const file = join(dir, 'cordis.patch.yml');
    writeFileSync(file, TEMPLATE, 'utf8');
    try {
      const off = togglePatchFile(file, 'modlens', true);
      expect(off.changed).toBe(true);
      expect(readFileSync(file, 'utf8')).toContain('- id: modlens\n  disabled: true');

      const on = togglePatchFile(file, 'modlens', false);
      expect(on.changed).toBe(true);
      const final = readFileSync(file, 'utf8');
      expect(final).not.toContain('modlens');
      expect(final.startsWith('# Your patch layer')).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
