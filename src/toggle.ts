// @file src/toggle.ts
// @description disable/enable 的共享核心：命令版（/plugin-audit）与 remote 版
//              （设置页「来源」tab 的开关按钮）共用同一套「匹配校验 + 持久化 + 即时生效」。
//
// 两条腿缺一不可（详见 DESIGN.md v0.2 节）：
//   1) togglePatchFile —— 写 profile 的 cordis.patch.yml（下次 boot 保持、可逆）；
//   2) loader.update / watchUserPatches（HMR）—— 运行时立即生效。
//
// v0.7 修正：DESIGN.md v0.2 曾假设「web profile 禁用了 HMR，只能靠 loader.update
// 立即生效」。实测（dsh-app-boot 的 runProfile）web profile 会**无条件**创建 hmr
// 服务并 watchUserPatches（cordis.patch.yml 一改即热重载 loader 树）。若 toggle 再
// 无条件调 loader.update，会与 HMR 形成双通道：插件被 apply 两次，注册了 webserver
// 路由的插件（如 dsh-genui）第二次注册时抛 `webserver: duplicate prefix route`。
// 因此改为：写文件后**优先轮询等 HMR 生效**（当前条目达到目标状态即成功），
// 超时才回退 loader.update（HMR 不可用的环境）。

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
 * @param entryId 目标条目在 Loader 树里的完整 id（含路径前缀，如 `include:ssh`），
 *                传给 loader.update 做运行时 resolve
 * @param patchId 目标条目在配置行里的原始 id（如 `ssh`），
 *                写进 cordis.patch.yml 的 `- id:` 行——patch 层按行自身的 id
 *                字段匹配，带前缀的完整 id 启动时匹配不到（v0.4 修复）
 * @param disabled 目标状态
 * @param patchPath profile 的 cordis.patch.yml 绝对路径
 * @param currentDisabled 写入 patch 文件后查询的「该条目当前 disabled 状态」
 *                        （undefined = 查不到）。web profile 的 watchUserPatches
 *                        会监听 patch 文件并即时生效（v0.7 实测：HMR 实际活跃，
 *                        见 toggle.ts 顶注），写文件后 HMR 会异步重载 loader。
 *                        toggle 会**轮询等待 HMR 生效**（最多 800ms），生效即跳过
 *                        loader.update——否则「写文件触发 HMR」+「loader.update」
 *                        双通道会把插件 apply 两次，注册了 webserver 路由的插件
 *                        （如 dsh-genui）第二次注册会抛 `duplicate prefix route`。
 *                        HMR 不可用/超时时回退到 loader.update（与 HMR 无关，立即生效）。
 * @returns 成功消息
 */
export async function performToggle(
  loader: ToggleLoader,
  entryId: string,
  patchId: string,
  disabled: boolean,
  patchPath: string,
  currentDisabled?: () => boolean | undefined,
): Promise<string> {
  // 1) 持久化：写 cordis.patch.yml（重启后保持；web profile 的 watchUserPatches
  //    监听到后也会即时重载，见 DESIGN.md v0.2）
  const result = togglePatchFile(patchPath, patchId, disabled);
  // 2) 即时生效：优先等 HMR（watchUserPatches）把 loader 树更新到目标状态；
  //    生效则不再 loader.update（v0.7 修复：避免与 HMR 双通道重复 apply 触发
  //    webserver 路由冲突）；超时则 loader.update 兜底（HMR 不可用的环境）。
  if (currentDisabled !== undefined) {
    const deadline = Date.now() + 800;
    while (Date.now() < deadline) {
      const current = currentDisabled();
      if (current === disabled) return `${result.message}，HMR 已即时生效`;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  await loader.update(entryId, { disabled });
  return `${result.message}，运行时已生效`;
}
