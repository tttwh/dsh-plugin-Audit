// @file src/toggle.ts
// @description disable/enable 的共享核心：命令版（/plugin-audit）与 remote 版
//              （设置页「来源」tab 的开关按钮）共用同一套「匹配校验 + 持久化 + 即时生效」。
//
// 两条腿缺一不可（详见 DESIGN.md v0.2 节）：
//   1) togglePatchFile —— 写 profile 的 cordis.patch.yml（下次 boot 保持、可逆）；
//   2) ctx.loader.update —— 运行时立即停用/启用 fiber（web profile 禁用了 HMR，
//      不能只靠写文件等重载）。

import type { ClassifiedEntry } from './classify';
import { togglePatchFile } from './patch';

/** 执行开关所需的最小 loader 面。 */
export interface ToggleLoader {
  update(id: string, options: { disabled?: boolean }): Promise<void>;
}

/** 匹配一个自装插件（包名或 entry id 包含关键词）。 */
export function matchUserPlugin(classified: ClassifiedEntry[], query: string): ClassifiedEntry[] {
  return classified.filter(
    (e) =>
      e.origin === 'user' &&
      (e.moduleName.toLocaleLowerCase().includes(query) ||
        e.entryId.toLocaleLowerCase().includes(query)),
  );
}

/**
 * 执行开关（持久化 + 即时生效）。
 *
 * @param loader loader 服务（ctx.loader）
 * @param entryId 目标条目 id
 * @param disabled 目标状态
 * @param patchPath profile 的 cordis.patch.yml 绝对路径
 * @returns 成功消息
 */
export async function performToggle(
  loader: ToggleLoader,
  entryId: string,
  disabled: boolean,
  patchPath: string,
): Promise<string> {
  // 1) 持久化：写 cordis.patch.yml（重启后保持）
  const result = togglePatchFile(patchPath, entryId, disabled);
  // 2) 即时生效：直接更新 loader fiber（不依赖 HMR）
  await loader.update(entryId, { disabled });
  return `${result.message}，运行时已生效`;
}
