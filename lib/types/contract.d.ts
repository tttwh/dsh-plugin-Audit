import { z } from 'zod';
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol';
/** toggle 的返回载荷。 */
export declare const toggleResultSchema: z.ZodReadonly<z.ZodObject<{
    entryId: z.ZodString;
    disabled: z.ZodBoolean;
    message: z.ZodString;
}, z.core.$strip>>;
export type ToggleResult = z.infer<typeof toggleResultSchema>;
/** 一个自装插件的更新状态（checkUpdates 返回）。 */
export declare const updateStatusSchema: z.ZodReadonly<z.ZodObject<{
    moduleName: z.ZodString;
    currentVersion: z.ZodString;
    latestVersion: z.ZodNullable<z.ZodString>;
    outdated: z.ZodBoolean;
    error: z.ZodNullable<z.ZodString>;
}, z.core.$strip>>;
export type UpdateStatus = z.infer<typeof updateStatusSchema>;
/** checkUpdates 的返回载荷。 */
export declare const checkUpdatesResultSchema: z.ZodReadonly<z.ZodObject<{
    packages: z.ZodReadonly<z.ZodArray<z.ZodReadonly<z.ZodObject<{
        moduleName: z.ZodString;
        currentVersion: z.ZodString;
        latestVersion: z.ZodNullable<z.ZodString>;
        outdated: z.ZodBoolean;
        error: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>>>;
    registryUnreachable: z.ZodBoolean;
}, z.core.$strip>>;
export type CheckUpdatesResult = z.infer<typeof checkUpdatesResultSchema>;
/** update 的返回载荷。 */
export declare const updateResultSchema: z.ZodReadonly<z.ZodObject<{
    ok: z.ZodBoolean;
    exitCode: z.ZodNullable<z.ZodNumber>;
    output: z.ZodString;
    updated: z.ZodReadonly<z.ZodArray<z.ZodString>>;
    error: z.ZodNullable<z.ZodString>;
}, z.core.$strip>>;
export type UpdateResult = z.infer<typeof updateResultSchema>;
/** 一个插件的双语描述：zh=中文（内置字典或英文兜底），en=英文（package.json 原文）。 */
export declare const localizedDescriptionSchema: z.ZodReadonly<z.ZodObject<{
    zh: z.ZodString;
    en: z.ZodString;
}, z.core.$strip>>;
export type LocalizedDescription = z.infer<typeof localizedDescriptionSchema>;
/** descriptions 的返回载荷：moduleName → 双语描述（zh 随系统语言，缺失给空串）。 */
export declare const descriptionsResultSchema: z.ZodReadonly<z.ZodRecord<z.ZodString, z.ZodReadonly<z.ZodObject<{
    zh: z.ZodString;
    en: z.ZodString;
}, z.core.$strip>>>>;
export type DescriptionsResult = z.infer<typeof descriptionsResultSchema>;
/** uninstall 的返回载荷。 */
export declare const uninstallResultSchema: z.ZodReadonly<z.ZodObject<{
    ok: z.ZodBoolean;
    moduleName: z.ZodString;
    message: z.ZodString;
    output: z.ZodString;
}, z.core.$strip>>;
export type UninstallResult = z.infer<typeof uninstallResultSchema>;
/**
 * pluginAudit remote 的调用描述符：toggle + checkUpdates + update。
 *
 * 参数都是普通 JSON 字段（source: 'json'，不需要 agent lookup——开关/更新是
 * 全局操作，与具体 agent/session 无关）。
 */
export declare const PLUGIN_AUDIT_INVOCATIONS: readonly InvocationDescriptor[];
//# sourceMappingURL=contract.d.ts.map