# dsh-plugin-diraud

[English](README.md) | 中文


基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的插件管理增强：按「来源」分组插件列表，一眼区分**官方自带插件**与**自装插件**。

## 特性

- **`/plugin-audit` 命令**：按「官方 / 自装」分组列出当前已加载插件，支持 `user` / `official` / 关键词过滤；
- **自装插件开关（两处入口）**：
  - 左侧菜单栏底部「插件目录」入口（图标按钮，点击弹出面板）：按来源分组展示，每张自装插件卡片带**启用 / 停用按钮**（点一下就切换）；
  - 聊天命令：`/plugin-audit disable|enable <关键词>`；
  - 均持久化到 profile 的 `cordis.patch.yml`（重启保留、可逆），并调用 `ctx.loader.update` 即时生效（不依赖 HMR）；官方/内置插件锁定不可操作；
- **「插件目录」面板**：卡片化分组展示，带来源徽标、搜索框与**功能描述**（读插件 package.json 的 description，v0.6，独立于官方「插件列表」页）；
- **自装插件更新（v0.6）**：「插件目录」面板顶部带「更新」区块——打开面板自动检查 npm registry，统计可更新总数（可一键全部更新），每个自装插件卡片「停用」旁带独立「更新」按钮（已是最新版显示灰字「已是最新」）；官方/内置插件与本插件自身锁定不可更新；
- **判定零依赖、可单测**：包名作用域 + 用户显式安装集双重规则（`@deepseek-ai/` 判官方、其余判自装）；
- **完全可逆**：只读展示，不改任何官方 bundle，一条命令卸载。

## 界面截图

左侧菜单栏底部「插件目录」入口（v0.5 起），点击弹出按来源分组的插件面板，每张卡片带启用/停用开关：

![插件目录](docs/plugin-catalog.png)

## 快速开始

前置：`pnpm`、`dsh` CLI。

```sh
# 安装
dsh plugin --profile web add https://github.com/tttwh/dsh-plugin-diraud/archive/refs/heads/main.tar.gz
```

装完**重启 `dsh web`**，然后：

- 聊天框输入 `/plugin-audit`，或
- 点击左侧菜单栏底部的「插件目录」入口。

## 命令一览

| 命令 | 用途 |
|---|---|
| `/plugin-audit` | 概览：自装逐行 + 官方计数 |
| `/plugin-audit user` | 只看自装 |
| `/plugin-audit official` | 只看官方（逐行） |
| `/plugin-audit <关键词>` | 按包名 / entry 过滤 |
| `/plugin-audit disable <关键词>` | 停用匹配到的**自装**插件（持久化） |
| `/plugin-audit enable <关键词>` | 启用匹配到的**自装**插件（持久化） |
| `dsh plugin --profile web remove dsh-plugin-diraud` | 卸载 |

> **开关如何持久化**：`disable/enable` 会把 `- id: <配置行原始 id>` + `disabled: true` 覆盖行写入 profile 的 `cordis.patch.yml`（用户配置层）。该文件被 dsh 的 `watchUserPatches` 监听（web profile 启动时会自动拉起监听），写入后即时生效；重启后保留；删除对应行即可恢复默认。
>
> **为什么是「原始 id」而不是 Loader 条目 id（v0.4 修复）**：Loader 树内条目的完整 id 带路径前缀（如 `include:ssh`），但 patch 层按配置行自身的 `id` 字段匹配，只认原始 id（`ssh`）。旧版本把带前缀的完整 id 写进 patch 文件，启动时被当作「找不到条目」跳过（每次 boot 打 warning），导致停用重启即失效——v0.4 起统一写原始 id，并自动清理历史遗留的 `include:<id>` 死行。

## 配置

来源判定默认按包名作用域；极端情况（如装了 `@deepseek-ai/` 前缀的第三方包）用 `extraUserPackages` 覆盖。在 profile 的 `cordis.patch.yml` 里覆盖本插件行：

```yaml
- id: plugin-audit
  config:
    extraUserPackages:
      - '@deepseek-ai/dsh-my-fork'   # 强制判为「自装」
```

## 目录结构

```text
dsh-plugin-diraud/
  src/classify.ts        来源判定纯函数（单一事实源，host / client 共用）
  src/patch.ts           cordis.patch.yml 读写：disable/enable 持久化（行级 YAML，零依赖）
  src/toggle.ts          开关共享核心（持久化 + ctx.loader.update 即时生效）
  src/updates.ts         更新核心：semver 比较、registry 探测、pnpm 执行（可单测）
  src/contract.ts        typert wire 契约（pluginAudit/toggle，host/client 共用）
  src/typert.ts          host 侧 manifest 注册
  src/runtime.ts         PluginAuditRuntime（@Remote toggle，executeToggle 可单测）
  src/index.ts           host：/plugin-audit 命令 + 注册 remote
  src/client/            侧边栏「插件目录」入口（React）+ 开关按钮 + client remote
  build.mjs              esbuild 构建（host ESM + client bundle）
  cordis.patch.yml       profile bundle patch（插入本插件）
  demo/                  演示与验证脚本（真实 profile 分组输出）
```

## 文档

- [DESIGN.md](DESIGN.md) —— 设计背景与查证依据（为何新增 tab 而非改官方 tab、来源判定规则与边界）

## 相关项目

- [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) —— DeepSeek Harness 官方仓库（DSH 本体）
- [omdsh-dev/community](https://github.com/omdsh-dev/community) —— 社区插件收录与协作入口

## 许可

[MIT](LICENSE) · Copyright (c) 2025 tttwh
