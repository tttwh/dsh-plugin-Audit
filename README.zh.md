# dsh-plugin-audit

基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的插件管理增强：按「来源」分组插件列表，一眼区分**官方自带插件**与**自装插件**。

## 特性

- **`/plugin-audit` 命令**：按「官方 / 自装」分组列出当前已加载插件，支持 `user` / `official` / 关键词过滤；
- **自装插件开关（两处入口）**：
  - 设置 → 插件 → 「来源」tab：每张自装插件卡片带**启用 / 停用按钮**（点一下就切换）；
  - 聊天命令：`/plugin-audit disable|enable <关键词>`；
  - 均持久化到 profile 的 `cordis.patch.yml`（重启保留、可逆），并调用 `ctx.loader.update` 即时生效（不依赖 HMR）；官方/内置插件锁定不可操作；
- **设置页「来源」tab**：卡片化分组展示，带来源徽标与搜索框（与官方「插件列表」tab 并列）；
- **判定零依赖、可单测**：包名作用域 + 用户显式安装集双重规则（`@deepseek-ai/` 判官方、其余判自装）；
- **完全可逆**：只读展示，不改任何官方 bundle，一条命令卸载。

## 快速开始

前置：`pnpm`、`dsh` CLI。

```sh
# 安装
dsh plugin --profile web add https://github.com/tttwh/dsh-plugin-audit/archive/refs/heads/main.tar.gz
```

装完**重启 `dsh web`**，然后：

- 聊天框输入 `/plugin-audit`，或
- 打开 设置 → 插件 → 「来源」tab。

## 命令一览

| 命令 | 用途 |
|---|---|
| `/plugin-audit` | 概览：自装逐行 + 官方计数 |
| `/plugin-audit user` | 只看自装 |
| `/plugin-audit official` | 只看官方（逐行） |
| `/plugin-audit <关键词>` | 按包名 / entry 过滤 |
| `/plugin-audit disable <关键词>` | 停用匹配到的**自装**插件（持久化） |
| `/plugin-audit enable <关键词>` | 启用匹配到的**自装**插件（持久化） |
| `dsh plugin --profile web remove dsh-plugin-audit` | 卸载 |

> **开关如何持久化**：`disable/enable` 会把 `- id: <entryId>` + `disabled: true` 覆盖行写入 profile 的 `cordis.patch.yml`（用户配置层）。该文件被 dsh 的 HMR 监听（`watchUserPatches`），写入后无需重启即时生效；重启后保留；删除对应行即可恢复默认。

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
dsh-plugin-audit/
  src/classify.ts        来源判定纯函数（单一事实源，host / client 共用）
  src/patch.ts           cordis.patch.yml 读写：disable/enable 持久化（行级 YAML，零依赖）
  src/toggle.ts          开关共享核心（持久化 + ctx.loader.update 即时生效）
  src/contract.ts        typert wire 契约（pluginAudit/toggle，host/client 共用）
  src/typert.ts          host 侧 manifest 注册
  src/runtime.ts         PluginAuditRuntime（@Remote toggle，executeToggle 可单测）
  src/index.ts           host：/plugin-audit 命令 + 注册 remote
  src/client/            「来源」tab（React）+ 开关按钮 + client remote
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
