// @file tests/runtime.test.ts
// @description runtime 开关核心（executeToggle）的单元测试：安全边界 + 持久化 + 即时生效。

import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { classifyEntry } from '../src/classify';
import type { ClassifiedEntry } from '../src/classify';
import { executeToggle } from '../src/runtime';
import type { RuntimeDeps } from '../src/runtime';

/**
 * 构造一个 Loader 条目（来源由 classifyEntry 判定：@deepseek-ai/ → 官方，其余 → 自装）。
 *
 * 真实 Loader 条目里 `id` 是树内完整 id（含路径前缀，如 `include:modlens`），
 * `options.id` 才是配置行原始 id；测试默认两者相同（简单场景），
 * 需要区分时用第三个参数显式给 configId。
 */
function entry(entryId: string, moduleName: string, configId?: string): ClassifiedEntry {
  return classifyEntry(
    { id: entryId, options: { id: configId ?? entryId, name: moduleName }, disabled: false },
    new Set(),
  );
}

/** 构造一个指向临时 patch 文件的 deps。 */
function makeDeps(
  entries: ClassifiedEntry[],
  patchPath: string | null,
  simulateHmr = true,
): RuntimeDeps {
  const updates: { id: string; opts: { disabled?: boolean } }[] = [];
  return {
    // 模拟 watchUserPatches（HMR）：每次调用都读 patch 文件，若该条目的顶层
    // 覆盖行带 `disabled: true` 则返回「已停用」状态；simulateHmr=false 时保持
    // 原始快照，模拟 HMR 不可用（toggle 需回退 loader.update）。
    classified: () =>
      simulateHmr && patchPath !== null && existsSync(patchPath)
        ? entries.map((e) => {
            const text = readFileSync(patchPath, 'utf8');
            // 顶层 `- id: <configId>` 行，之后到下一个顶层条目前的区间内找 disabled 字段。
            const lines = text.split('\n');
            const row = lines.findIndex(
              (l) => /^-\s+id:\s*(.+?)\s*$/.test(l) && l.replace(/^-\s+id:\s*/, '').trim() === e.configId,
            );
            if (row === -1) return e; // 无覆盖行 = 启用
            let end = lines.length;
            for (let i = row + 1; i < lines.length; i++) {
              if (/^-\s+id:/.test(lines[i])) {
                end = i;
                break;
              }
            }
            const disabled = lines
              .slice(row + 1, end)
              .some((l) => /^\s+disabled:\s*true\s*$/.test(l));
            return { ...e, enabled: !disabled };
          })
        : entries,
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
  it('自装插件：写 patch 文件 + HMR 即时生效（不重复 loader.update）', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-audit-runtime-'));
    const file = join(dir, 'cordis.patch.yml');
    writeFileSync(file, '# header\n[]\n', 'utf8');
    try {
      const deps = makeDeps([entry('modlens', '@liustack/modlens')], file);
      const result = await executeToggle(deps, 'modlens', true);
      expect(result.entryId).toBe('modlens');
      expect(result.disabled).toBe(true);
      // v0.7：patch 写入后 watchUserPatches（HMR）即时生效，不再重复 loader.update，
      // 避免「写文件触发 HMR + loader.update」双通道把插件 apply 两次
      // （注册了 webserver 路由的插件第二次注册会 duplicate）。
      expect(deps._updates).not.toContainEqual({ id: 'modlens', opts: { disabled: true } });
      // 持久化文件里出现了 disabled 覆盖行
      expect(readFileSync(file, 'utf8')).toContain('- id: modlens\n  disabled: true');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('HMR 不可用时回退 loader.update（仍即时生效）', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-audit-runtime-'));
    const file = join(dir, 'cordis.patch.yml');
    writeFileSync(file, '# header\n[]\n', 'utf8');
    try {
      const deps = makeDeps([entry('modlens', '@liustack/modlens')], file, false);
      const result = await executeToggle(deps, 'modlens', true);
      expect(result.entryId).toBe('modlens');
      expect(result.disabled).toBe(true);
      expect(deps._updates).toContainEqual({ id: 'modlens', opts: { disabled: true } });
      expect(readFileSync(file, 'utf8')).toContain('- id: modlens\n  disabled: true');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('回归 v0.4：patch 文件按配置行原始 id 写，loader.update 用树内完整 id', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-audit-runtime-'));
    const file = join(dir, 'cordis.patch.yml');
    writeFileSync(file, '# header\n[]\n', 'utf8');
    try {
      // 真实场景：树内完整 id 带 `include:` 前缀，配置行原始 id 是 modlens。
      // HMR 不可用（simulateHmr=false），走 loader.update 回退路径验证 id 传递。
      const deps = makeDeps([entry('include:modlens', '@liustack/modlens', 'modlens')], file, false);
      const result = await executeToggle(deps, 'include:modlens', true);
      expect(result.entryId).toBe('include:modlens');
      // loader.update 用完整 id 才能 resolve 到 include 子树里的条目
      expect(deps._updates).toContainEqual({ id: 'include:modlens', opts: { disabled: true } });
      // 但 patch 文件必须写原始 id——patch 层按配置行自身 id 匹配，带前缀的行
      // 启动时被跳过（v0.2/v0.3 的 bug，停用重启即失效）。
      const text = readFileSync(file, 'utf8');
      expect(text).toContain('- id: modlens\n  disabled: true');
      expect(text).not.toContain('include:modlens');
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
    const deps = makeDeps([entry('plugin-audit', 'dsh-plugin-Audit')], '/tmp/x.yml');
    await expect(executeToggle(deps, 'plugin-audit', true)).rejects.toThrow(/不能.*本插件自身/);
  });

  it('patch 路径缺失 → 拒绝', async () => {
    const deps = makeDeps([entry('modlens', '@liustack/modlens')], null);
    await expect(executeToggle(deps, 'modlens', true)).rejects.toThrow(/cordis\.patch\.yml/);
  });
});
