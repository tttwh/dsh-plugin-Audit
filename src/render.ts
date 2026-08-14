// @file src/render.ts
// @description 把分类结果渲染成人类可读的分组文本（/plugin-audit 命令输出）。

import type { ClassifiedEntry, Origin, OriginGroups } from './classify';

const ORIGIN_LABEL: Record<Origin, string> = {
  official: '官方',
  user: '自装',
  builtin: '内置',
};

/** 状态小标签：启用 / 停用。 */
function stateTag(entry: ClassifiedEntry): string {
  return entry.enabled ? '已启用' : '已停用';
}

/** 渲染一条插件行。 */
function renderLine(entry: ClassifiedEntry, withReason: boolean): string {
  const tag = stateTag(entry);
  const origin = ORIGIN_LABEL[entry.origin] ?? entry.origin;
  let line = `  [${tag}] ${entry.moduleName} · ${origin} · entry=${entry.entryId}`;
  if (withReason && entry.reason) line += ` · ${entry.reason}`;
  return line;
}

export interface RenderOptions {
  /** 是否在每行追加判定依据（教学演示用） */
  withReason?: boolean;
  /** 是否逐行列出官方插件（官方通常上百个，默认只给计数） */
  listOfficial?: boolean;
  /** 是否逐行列出内置模块 */
  listBuiltin?: boolean;
}

/**
 * 渲染完整的分组列表。
 */
export function renderGroups(groups: OriginGroups<ClassifiedEntry>, opts: RenderOptions = {}): string {
  const { withReason = false, listOfficial = false, listBuiltin = false } = opts;
  const total = groups.official.length + groups.user.length + groups.builtin.length;
  const lines: string[] = [];

  lines.push('插件来源分类（官方 vs 自装）');
  lines.push(`总计 ${total}：官方 ${groups.official.length} · 自装 ${groups.user.length} · 内置 ${groups.builtin.length}`);
  lines.push('');

  // 自装永远逐行列出（数量少、用户最关心）。
  lines.push(`── 自装插件（${groups.user.length}）──`);
  if (groups.user.length === 0) {
    lines.push('  （无）');
  } else {
    for (const entry of groups.user) lines.push(renderLine(entry, withReason));
  }
  lines.push('');

  // 官方：默认给「计数 + 作用域说明」，不刷屏；也可要求逐行列出。
  lines.push(`── 官方插件（${groups.official.length}）──`);
  if (groups.official.length === 0) {
    lines.push('  （无）');
  } else if (listOfficial) {
    for (const entry of groups.official) lines.push(renderLine(entry, withReason));
  } else {
    lines.push(`  全部位于 @deepseek-ai/ 官方发行作用域（共 ${groups.official.length} 个）。`);
    lines.push('  输入 /plugin-audit official 可逐行列出官方插件。');
  }
  lines.push('');

  if (groups.builtin.length > 0) {
    lines.push(`── 内置模块（${groups.builtin.length}）──`);
    if (listBuiltin) {
      for (const entry of groups.builtin) lines.push(renderLine(entry, withReason));
    } else {
      lines.push(`  cordis: 前缀的 Loader 基建（共 ${groups.builtin.length} 个）。`);
    }
  }

  return lines.join('\n');
}
