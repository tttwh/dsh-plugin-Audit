// @file src/contract.ts
// @description dsh-plugin-Audit 的 wire 契约（typert remote），host 与 client 共享。
//
// 为什么需要它：设置页「来源」tab 里的开关按钮需要一条 client → host 的调用通道。
// dsh 的官方 host-plugin-inventory 是只读的（明确 "cannot enable/disable"），
// 所以要自建一个 pluginAudit remote：client 调 `pluginAudit/toggle`，host 端
// 写 cordis.patch.yml（持久化）+ ctx.loader.update（即时生效）。
//
// 本文件是「手写」的 typert 契约（dsh-at-file 也是手写，非 tsdown 生成）：
// zod schema 同时被 host 网关与 client 端严格校验。

import { z } from 'zod';
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol';

/** toggle 的返回载荷。 */
export const toggleResultSchema = z
  .object({
    entryId: z.string().min(1),
    disabled: z.boolean(),
    message: z.string(),
  })
  .readonly();

export type ToggleResult = z.infer<typeof toggleResultSchema>;

/** 一个 wire 参数的 codec 快捷构造（strict 模式 + 类型符号）。 */
function strictCodec(typeSymbol: string, schema: z.ZodType) {
  return { mode: 'strict' as const, typeSymbol, schema };
}

/**
 * pluginAudit remote 的调用描述符：只有一条 `toggle`。
 *
 * 参数都是普通 JSON 字段（source: 'json'，不需要 agent lookup——开关是全局操作，
 * 与具体 agent/session 无关）。
 */
export const PLUGIN_AUDIT_INVOCATIONS: readonly InvocationDescriptor[] = [
  {
    id: 'dsh-plugin-Audit#pluginAudit/toggle',
    service: 'pluginAudit',
    namespace: 'pluginAudit',
    method: 'toggle',
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'entryId',
        wire: 'entryId',
        source: 'json',
        codec: strictCodec('dsh-plugin-Audit#entryId', z.string().min(1)),
      },
      {
        name: 'disabled',
        wire: 'disabled',
        source: 'json',
        codec: strictCodec('dsh-plugin-Audit#disabled', z.boolean()),
      },
    ],
    result: strictCodec('dsh-plugin-Audit#ToggleResult', toggleResultSchema),
  },
];
