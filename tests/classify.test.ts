// @file tests/classify.test.ts
// @description classify.ts 的单元测试（vitest），覆盖来源判定规则与边界情况。

import { describe, expect, it } from 'vitest';

import { classifyOrigin, classifyEntry, groupByOrigin } from '../src/classify';

describe('classifyOrigin', () => {
  it('官方作用域 @deepseek-ai/* → official', () => {
    expect(classifyOrigin('@deepseek-ai/dsh-tool-bash').origin).toBe('official');
    expect(classifyOrigin('@deepseek-ai/cordis-plugin-loader').origin).toBe('official');
    expect(classifyOrigin('@deepseek-ai/cosmokit').origin).toBe('official');
  });

  it('非官方作用域 / 无作用域 / 相对路径 → user', () => {
    expect(classifyOrigin('dsh-at-file').origin).toBe('user');
    expect(classifyOrigin('dsh-better-sidebar').origin).toBe('user');
    expect(classifyOrigin('@liustack/modlens').origin).toBe('user');
    expect(classifyOrigin('@omdsh-dev/dsh-genui').origin).toBe('user');
    expect(classifyOrigin('./my-local-plugin.js').origin).toBe('user');
  });

  it('cordis: 内置前缀 → builtin', () => {
    expect(classifyOrigin('cordis:include').origin).toBe('builtin');
    expect(classifyOrigin('cordis:group').origin).toBe('builtin');
  });

  it('覆盖优先：用户显式装了 @deepseek-ai/ 前缀的第三方包 → 仍判 user', () => {
    const extra = new Set(['@deepseek-ai/dsh-my-fork']);
    expect(classifyOrigin('@deepseek-ai/dsh-my-fork', extra).origin).toBe('user');
  });

  it('官方 bundle 升级新增插件无需维护名单（仍在该作用域内）', () => {
    expect(classifyOrigin('@deepseek-ai/dsh-tool-new-thing').origin).toBe('official');
  });
});

describe('classifyEntry', () => {
  it('输出字段与 host-plugin-inventory 对齐', () => {
    const entry = { id: 'modlens', options: { name: '@liustack/modlens' }, disabled: false };
    const out = classifyEntry(entry, new Set());
    expect(out).toMatchObject({
      entryId: 'modlens',
      moduleName: '@liustack/modlens',
      origin: 'user',
      enabled: true,
    });
  });
});

describe('groupByOrigin', () => {
  it('三分组', () => {
    const entries = [
      { origin: 'official' as const },
      { origin: 'user' as const },
      { origin: 'builtin' as const },
      { origin: 'user' as const },
    ];
    const g = groupByOrigin(entries);
    expect(g.official).toHaveLength(1);
    expect(g.user).toHaveLength(2);
    expect(g.builtin).toHaveLength(1);
  });
});
