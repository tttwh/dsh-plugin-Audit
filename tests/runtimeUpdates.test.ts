// @file tests/runtimeUpdates.test.ts
// @description remote 更新的来源安全边界与“退出码 0 后实际版本核验”。

import { describe, expect, it } from 'vitest';

import { classifyEntry } from '../src/classify';
import { executeUpdateRemote } from '../src/runtime';
import type { RuntimeDeps } from '../src/runtime';

function deps(spec: string): RuntimeDeps {
  const item = classifyEntry(
    { id: 'include:plugin', options: { id: 'plugin', name: '@scope/plugin' }, disabled: false },
    new Set(),
  );
  return {
    classified: () => [item],
    patchPath: () => '/profile/cordis.patch.yml',
    profileDir: () => '/profile',
    loader: { update: async () => undefined },
    fetchJson: async () => ({ ok: true, json: { version: '2.0.0' } }),
    readPackageJson: async () => ({ version: '1.0.0' }),
    spawnRun: async () => ({ exitCode: 0, output: 'Done' }),
    dependencySpec: () => spec,
  };
}

describe('executeUpdateRemote verification', () => {
  it('拒绝 Desktop 托管的 link 插件', async () => {
    const runtime = deps(
      'link:C:/Program Files/DeepSeek Harness Desktop/resources/app.asar.unpacked/node_modules/@scope/plugin',
    );
    await expect(executeUpdateRemote(runtime, ['@scope/plugin'])).rejects.toThrow(/不能独立更新链接插件/);
  });

  it('pnpm 返回 0 但磁盘版本仍落后时返回失败', async () => {
    const result = await executeUpdateRemote(deps('^1.0.0'), ['@scope/plugin']);
    expect(result.ok).toBe(false);
    expect(result.updated).toEqual([]);
    expect(result.error).toMatch(/实际版本仍未更新/);
  });
});
