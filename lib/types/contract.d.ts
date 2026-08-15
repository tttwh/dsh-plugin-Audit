import { z } from 'zod';
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol';
/** toggle 的返回载荷。 */
export declare const toggleResultSchema: z.ZodReadonly<z.ZodObject<{
    entryId: z.ZodString;
    disabled: z.ZodBoolean;
    message: z.ZodString;
}, z.core.$strip>>;
export type ToggleResult = z.infer<typeof toggleResultSchema>;
/**
 * pluginAudit remote 的调用描述符：只有一条 `toggle`。
 *
 * 参数都是普通 JSON 字段（source: 'json'，不需要 agent lookup——开关是全局操作，
 * 与具体 agent/session 无关）。
 */
export declare const PLUGIN_AUDIT_INVOCATIONS: readonly InvocationDescriptor[];
//# sourceMappingURL=contract.d.ts.map