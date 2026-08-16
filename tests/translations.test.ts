// @file tests/translations.test.ts
// @description 双语描述字典（src/translations.ts）的单元测试：
//              字典命中返回中文，未命中回退英文原文。

import { describe, expect, it } from 'vitest';

import { localizeDescription } from '../src/translations';

describe('localizeDescription', () => {
  it('字典命中的包返回中文描述', () => {
    const d = localizeDescription('dshmarket', 'English fallback');
    expect(d.zh).toContain('插件市场');
    expect(d.en).toContain('Visual plugin market');
  });

  it('官方插件也有中文描述', () => {
    const d = localizeDescription('@deepseek-ai/dsh-llm', 'Provider-neutral LLM service interface');
    expect(d.zh).toContain('LLM 服务接口');
    expect(d.en).toContain('Provider-neutral LLM');
  });

  it('字典没有的包回退英文原文（zh=en）', () => {
    const d = localizeDescription('@deepseek-ai/some-new-pkg', 'English original description');
    expect(d.zh).toBe('English original description');
    expect(d.en).toBe('English original description');
  });

  it('包没装时 fallback 为空串', () => {
    const d = localizeDescription('@deepseek-ai/missing', '');
    expect(d.zh).toBe('');
    expect(d.en).toBe('');
  });
});
