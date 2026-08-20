// @file tests/metadata.test.ts
// @description package.json repository/homepage 的 GitHub 地址归一化与安全边界。

import { describe, expect, it } from 'vitest';

import { normalizeGitHubUrl, resolveGitHubUrl } from '../src/metadata';

describe('normalizeGitHubUrl', () => {
  it('支持 npm 常见 repository 格式并去掉 .git', () => {
    expect(normalizeGitHubUrl('git+https://github.com/liustack/modlens.git')).toBe(
      'https://github.com/liustack/modlens',
    );
    expect(normalizeGitHubUrl({ type: 'git', url: 'git@github.com:crazywoola/dsh-balance.git' })).toBe(
      'https://github.com/crazywoola/dsh-balance',
    );
    expect(normalizeGitHubUrl('github:tttwh/dsh-plugin-diraud')).toBe(
      'https://github.com/tttwh/dsh-plugin-diraud',
    );
  });

  it('homepage 的子路径、fragment 归一化到仓库主页', () => {
    expect(resolveGitHubUrl(undefined, 'https://github.com/owner/repo#readme')).toBe(
      'https://github.com/owner/repo',
    );
  });

  it('拒绝非 GitHub、无仓库名及非 HTTP 协议', () => {
    expect(normalizeGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
    expect(normalizeGitHubUrl('https://github.com/owner')).toBeNull();
    expect(normalizeGitHubUrl('javascript:alert(1)')).toBeNull();
  });
});
