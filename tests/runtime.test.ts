// @file tests/runtime.test.ts
// @description runtime 开关核心（executeToggle）的单元测试：安全边界 + 持久化 + 即时生效。

import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { classifyEntry } from '../src/classify';
import type { ClassifiedEntry } from '../src/classify';
import { executeToggle } from '../src/runtime';
import type { RuntimeDeps } from '../src/runtime';

/** 构造一个 Loader 条目（来源由 classifyEntry 判定：@deepseek-ai/ → 官方，其余 → 自装）。 */
function entry(entryId: string, moduleName: string): ClassifiedEntry {
  return classifyEntry({ id: entryId, options: { name: moduleName }, disabled: false }, new Set());
}

/** 构造一个指向临时 patch 文件的 deps。 */
function makeDeps(entries: ClassifiedEntry[], patchPath: string | null): RuntimeDeps {
  const updates: { id: string; opts: { disabled?: boolean } }[] = [];
  return {
    classified: () => entries,
    patchPath: () => patchPath,
    loader: {
      update: async (id, opts) => {
        updates.push({ id, opts });
      },
    },
    // 测试用：记录 loader.update 调用
    _updates: updates,
  } as RuntimeDeps & { _updates: typeof updates };
}

describe('executeToggle', () => {
  it('自装插件：写 patch 文件 + 调 loader.update（即时生效）', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-audit-runtime-'));
    const file = join(dir, 'cordis.patch.yml');
    writeFileSync(file, '# header\n[]\n', 'utf8');
    try {
      const deps = makeDeps([entry('modlens', '@liustack/modlens')], file);
      const result = await executeToggle(deps, 'modlens', true);
      expect(result.entryId).toBe('modlens');
      expect(result.disabled).toBe(true);
      expect(deps._updates).toContainEqual({ id: 'modlens', opts: { disabled: true } });
      // 持久化文件里出现了 disabled 覆盖行
      const { readFileSync } = await import('node:fs');
      expect(readFileSync(file, 'utf8')).toContain('- id: modlens\n  disabled: true');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('未知 entry → 拒绝', async () => {
    const deps = makeDeps([entry('modlens', '@liustack/modlens')], '/tmp/x.yml');
    await expect(executeToggle(deps, 'ghost', true)).rejects.toThrow(/未知插件 entry/);
  });

  it('官方插件 → 安全边界拒绝', async () => {
    const deps = makeDeps([entry('timer', '@deepseek-ai/cordis-plugin-timer')], '/tmp/x.yml');
    await expect(executeToggle(deps, 'timer', true)).rejects.toThrow(/安全边界.*只能操作自装/);
  });

  it('本插件自身 → 拒绝', async () => {
    const deps = makeDeps([entry('plugin-audit', 'dsh-plugin-audit')], '/tmp/x.yml');
    await expect(executeToggle(deps, 'plugin-audit', true)).rejects.toThrow(/不能.*本插件自身/);
  });

  it('patch 路径缺失 → 拒绝', async () => {
    const deps = makeDeps([entry('modlens', '@liustack/modlens')], null);
    await expect(executeToggle(deps, 'modlens', true)).rejects.toThrow(/cordis\.patch\.yml/);
  });
});
