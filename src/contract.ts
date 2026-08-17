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

/** 一个自装插件的更新状态（checkUpdates 返回）。 */
export const updateStatusSchema = z
  .object({
    moduleName: z.string().min(1),
    currentVersion: z.string(),
    latestVersion: z.string().nullable(),
    /** 有可用新版（latest 非空且 > current）。 */
    outdated: z.boolean(),
    /** 单个插件探测失败时的原因（如 registry 404 / 网络错误）。 */
    error: z.string().nullable(),
  })
  .readonly();

export type UpdateStatus = z.infer<typeof updateStatusSchema>;

/** checkUpdates 的返回载荷。 */
export const checkUpdatesResultSchema = z
  .object({
    /** 本次检查的自装插件更新状态（按 loader 顺序）。 */
    packages: z.array(updateStatusSchema).readonly(),
    /** 全部插件都无法探测 registry（网络/registry 不可达）时为 true。 */
    registryUnreachable: z.boolean(),
  })
  .readonly();

export type CheckUpdatesResult = z.infer<typeof checkUpdatesResultSchema>;

/** update 的返回载荷。 */
export const updateResultSchema = z
  .object({
    ok: z.boolean(),
    /** pnpm 进程的退出码；null 表示进程未正常退出（超时/被 kill）。 */
    exitCode: z.number().nullable(),
    /** pnpm 的输出（截断到 16KB，保留尾部）。 */
    output: z.string(),
    /** 实际更新的插件名列表。 */
    updated: z.array(z.string()).readonly(),
    /** 失败原因（ok=false 时）。 */
    error: z.string().nullable(),
  })
  .readonly();

export type UpdateResult = z.infer<typeof updateResultSchema>;

/** 一个插件的双语描述：zh=中文（内置字典或英文兜底），en=英文（package.json 原文）。 */
export const localizedDescriptionSchema = z
  .object({
    zh: z.string(),
    en: z.string(),
  })
  .readonly();

export type LocalizedDescription = z.infer<typeof localizedDescriptionSchema>;

/** descriptions 的返回载荷：moduleName → 双语描述（zh 随系统语言，缺失给空串）。 */
export const descriptionsResultSchema = z.record(z.string(), localizedDescriptionSchema).readonly();

export type DescriptionsResult = z.infer<typeof descriptionsResultSchema>;

/** uninstall 的返回载荷。 */
export const uninstallResultSchema = z
  .object({
    ok: z.boolean(),
    moduleName: z.string(),
    message: z.string(),
    /** pnpm remove 的输出（截断）。 */
    output: z.string(),
  })
  .readonly();

export type UninstallResult = z.infer<typeof uninstallResultSchema>;

/** 一个 wire 参数的 codec 快捷构造（strict 模式 + 类型符号）。 */
function strictCodec(typeSymbol: string, schema: z.ZodType) {
  return { mode: 'strict' as const, typeSymbol, schema };
}

/**
 * pluginAudit remote 的调用描述符：toggle + checkUpdates + update。
 *
 * 参数都是普通 JSON 字段（source: 'json'，不需要 agent lookup——开关/更新是
 * 全局操作，与具体 agent/session 无关）。
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
  {
    id: 'dsh-plugin-Audit#pluginAudit/checkUpdates',
    service: 'pluginAudit',
    namespace: 'pluginAudit',
    method: 'checkUpdates',
    invocation: { kind: 'direct' },
    parameters: [],
    result: strictCodec('dsh-plugin-Audit#CheckUpdatesResult', checkUpdatesResultSchema),
  },
  {
    id: 'dsh-plugin-Audit#pluginAudit/update',
    service: 'pluginAudit',
    namespace: 'pluginAudit',
    method: 'update',
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'moduleNames',
        wire: 'moduleNames',
        source: 'json',
        codec: strictCodec('dsh-plugin-Audit#moduleNames', z.array(z.string().min(1)).min(1)),
      },
    ],
    result: strictCodec('dsh-plugin-Audit#UpdateResult', updateResultSchema),
  },
  {
    id: 'dsh-plugin-Audit#pluginAudit/descriptions',
    service: 'pluginAudit',
    namespace: 'pluginAudit',
    method: 'descriptions',
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'moduleNames',
        wire: 'moduleNames',
        source: 'json',
        codec: strictCodec('dsh-plugin-Audit#moduleNames', z.array(z.string().min(1))),
      },
    ],
    result: strictCodec('dsh-plugin-Audit#DescriptionsResult', descriptionsResultSchema),
  },
  {
    id: 'dsh-plugin-Audit#pluginAudit/uninstall',
    service: 'pluginAudit',
    namespace: 'pluginAudit',
    method: 'uninstall',
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'moduleName',
        wire: 'moduleName',
        source: 'json',
        codec: strictCodec('dsh-plugin-Audit#moduleName', z.string().min(1)),
      },
    ],
    result: strictCodec('dsh-plugin-Audit#UninstallResult', uninstallResultSchema),
  },
];
