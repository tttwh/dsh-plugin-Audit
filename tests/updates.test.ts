// @file tests/updates.test.ts
// @description 「检查更新 / 执行更新」核心逻辑（src/updates.ts）的单元测试：
//              semver 比较、registry 探测、pnpm 执行与候选回退。

import { describe, expect, it } from 'vitest';

import { compareVersions, executeCheckUpdates, executeUpdate, registryLatestUrl } from '../src/updates';
import type { UpdatesDeps } from '../src/updates';

/** 构造 UpdatesDeps 的便捷工具。 */
function makeDeps(overrides: Partial<UpdatesDeps> = {}): UpdatesDeps {
  return {
    profileDir: '/tmp/profile',
    moduleNames: [],
    fetch: { fetchJson: async () => ({ ok: false, json: null }) },
    read: { readPackageJson: async () => undefined },
    spawn: { run: async () => ({ exitCode: 0, output: '' }) },
    ...overrides,
  };
}

describe('compareVersions', () => {
  it('主/次/补丁版本比较', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('1.2.4', '1.2.3')).toBeGreaterThan(0);
    expect(compareVersions('1.3.0', '1.2.9')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
    expect(compareVersions('1.2.3', '1.2.4')).toBeLessThan(0);
  });

  it('预发布版本视为更旧', () => {
    expect(compareVersions('1.0.0-rc.1', '1.0.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '1.0.0-rc.1')).toBeGreaterThan(0);
  });

  it('v 前缀与非法输入降级', () => {
    expect(compareVersions('v1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('garbage', '1.0.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', 'garbage')).toBeGreaterThan(0);
  });
});

describe('registryLatestUrl', () => {
  it('作用域包名 URL 编码斜杠', () => {
    expect(registryLatestUrl('@linxin666/dsh-ssh')).toBe(
      'https://registry.npmjs.org/@linxin666%2Fdsh-ssh/latest',
    );
    expect(registryLatestUrl('dshmarket')).toBe('https://registry.npmjs.org/dshmarket/latest');
  });
});

describe('executeCheckUpdates', () => {
  it('有新版 → outdated=true；版本相同 → outdated=false', async () => {
    const deps = makeDeps({
      moduleNames: ['@a/pkg', 'dshmarket'],
      read: {
        readPackageJson: async (name) =>
          name === '@a/pkg' ? { version: '1.0.0' } : { version: '2.0.0' },
      },
      fetch: {
        fetchJson: async (url) =>
          url.includes('@a%2Fpkg') ? { ok: true, json: { version: '1.2.0' } } : { ok: true, json: { version: '2.0.0' } },
      },
    });
    const result = await executeCheckUpdates(deps);
    expect(result.registryUnreachable).toBe(false);
    expect(result.packages).toHaveLength(2);
    expect(result.packages[0]).toMatchObject({
      moduleName: '@a/pkg',
      currentVersion: '1.0.0',
      latestVersion: '1.2.0',
      outdated: true,
      error: null,
    });
    expect(result.packages[1]).toMatchObject({
      moduleName: 'dshmarket',
      currentVersion: '2.0.0',
      latestVersion: '2.0.0',
      outdated: false,
    });
  });

  it('registry 全部不可达 → registryUnreachable=true', async () => {
    const deps = makeDeps({
      moduleNames: ['a', 'b'],
      read: { readPackageJson: async () => ({ version: '1.0.0' }) },
      fetch: { fetchJson: async () => ({ ok: false, json: null }) },
    });
    const result = await executeCheckUpdates(deps);
    expect(result.registryUnreachable).toBe(true);
    expect(result.packages.every((p) => p.latestVersion === null)).toBe(true);
  });

  it('单个包探测失败不中断整体', async () => {
    const deps = makeDeps({
      moduleNames: ['ok', 'bad'],
      read: { readPackageJson: async () => ({ version: '1.0.0' }) },
      fetch: {
        fetchJson: async (url) =>
          url.includes('ok') ? { ok: true, json: { version: '1.1.0' } } : { ok: false, json: null },
      },
    });
    const result = await executeCheckUpdates(deps);
    expect(result.registryUnreachable).toBe(false);
    expect(result.packages.find((p) => p.moduleName === 'ok')?.outdated).toBe(true);
    expect(result.packages.find((p) => p.moduleName === 'bad')?.error).not.toBeNull();
  });
});

describe('executeUpdate', () => {
  it('pnpm 成功 → ok=true', async () => {
    const deps = makeDeps({
      moduleNames: ['@a/pkg'],
      spawn: { run: async () => ({ exitCode: 0, output: 'Done' }) },
    });
    const result = await executeUpdate(deps);
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    // v0.6：add <pkg>@latest + --config.minimumReleaseAge=0 真正升到 registry 最新
    // （绕过 pnpm 11 对发布不足 1 天新版本的 supply-chain 拦截）。
    expect(result.output).toContain('pnpm add @a/pkg@latest --config.minimumReleaseAge=0');
  });

  it('pnpm 失败 → 不尝试候选（返回非零码）', async () => {
    const deps = makeDeps({
      moduleNames: ['@a/pkg'],
      spawn: { run: async () => ({ exitCode: 1, output: 'ERR' }) },
    });
    const result = await executeUpdate(deps);
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('pnpm 不存在 → 依次尝试 corepack / npx，全部缺失则报错', async () => {
    const calls: string[] = [];
    const deps = makeDeps({
      moduleNames: ['@a/pkg'],
      spawn: {
        run: async (command) => {
          calls.push(command);
          return { exitCode: null, output: '', spawnError: 'ENOENT' };
        },
      },
    });
    const result = await executeUpdate(deps);
    expect(calls).toEqual(['pnpm', 'corepack', 'npx']);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/pnpm not found/);
  });
});
