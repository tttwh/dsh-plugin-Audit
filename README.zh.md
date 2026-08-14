# dsh-plugin-audit

按来源分组 DeepSeek Harness（dsh）插件列表，一眼区分**官方自带插件**与**你自己安装的插件**。社区自建插件，与 DeepSeek 官方无隶属、授权或背书关系。

## 功能

- 聊天框输入 `/plugin-audit`：按「官方 / 自装」分组列出当前插件，支持过滤。
- 设置 → 插件 → 「来源」tab：卡片化分组展示，带来源徽标与搜索框。

## 安装

```sh
dsh plugin --profile web add https://github.com/tttwh/dsh-plugin-audit/archive/refs/heads/main.tar.gz
```

装完**重启 `dsh web`**，然后：

| 入口 | 用法 |
|---|---|
| 命令 | `/plugin-audit`（概览）· `/plugin-audit user` · `/plugin-audit official` · `/plugin-audit <关键词>` |
| 设置页 | 设置 → 插件 → 「来源」tab |

卸载：`dsh plugin --profile web remove dsh-plugin-audit`（重启后完全恢复原状）

## 投稿信息（omdsh-dev/community 标准）

| # | 项目 | 内容 |
|---|---|---|
| 1 | 名称与仓库 | `dsh-plugin-audit` · https://github.com/tttwh/dsh-plugin-audit |
| 2 | 功能与关系 | 面向 DeepSeek Harness 的插件管理增强：按来源分组插件列表，不改动任何官方 bundle |
| 3 | 安装方式 | 见上「安装」 |
| 4 | 许可证与版权 | MIT License · Copyright (c) 2025 tttwh |
| 5 | 维护状态 | 活跃维护（单人）· tttwh |
| 6 | 风险与限制 | 只读展示、不改变插件加载；来源判定基于包名作用域，详见下文 |

## 开发

```sh
npm install
npm run build        # 产出 lib/（构建产物需提交：tarball 安装不现场构建）
npm run typecheck    # tsc --noEmit
npm test             # vitest run
```

## 已知风险与限制

- **只读**：不改任何插件的启用/配置/加载，不影响原有插件功能。
- **来源判定基于包名作用域**：`@deepseek-ai/` 判官方、其余判自装；极端情况可用 `extraUserPackages` 覆盖（见 `cordis.patch.yml`）。
- **兼容性**：依赖默认 web profile 提供的 `loader`/`commands`（host）与 `remote.pluginInventory`/`settings.plugins.tab`（client）。

设计背景与查证依据见 [DESIGN.md](DESIGN.md)。
