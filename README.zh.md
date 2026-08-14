# dsh-plugin-audit

审计 DeepSeek Harness（dsh）插件列表的来源归属，按「官方 / 自装」分组展示：一眼区分「官方自带插件」和「你自己安装的插件」。

- **两条入口**：① 聊天框 `/plugin-audit` 命令；② 设置 → 插件 → 新增「来源」tab。
- **判定**：纯函数、零运行时依赖、可单测，依据「包名作用域 + 用户显式安装集」双重规则。
- **可逆**：`dsh plugin --profile web remove dsh-plugin-audit` 一条命令卸载，不改官方 bundle 一个字节。

> 本项目为社区自建插件，与 DeepSeek 官方无隶属、授权或背书关系。

---

## 投稿信息（omdsh-dev/community 标准六项）

| # | 项目 | 内容 |
|---|---|---|
| 1 | 名称与仓库 | `dsh-plugin-audit` · <https://github.com/tttwh/dsh-plugin-audit> |
| 2 | 功能与关系 | 面向 DeepSeek Harness（dsh）的插件管理增强：按来源分组展示插件列表（官方 vs 自装），不改动任何官方 bundle |
| 3 | 安装方式 | `dsh plugin --profile web add https://github.com/tttwh/dsh-plugin-audit/archive/refs/heads/main.tar.gz` |
| 4 | 许可证与版权 | MIT License · Copyright (c) 2025 tttwh |
| 5 | 维护状态 | 活跃维护（单人）· 维护者：tttwh |
| 6 | 风险与限制 | 只读展示，不改变插件加载；来源判定依赖包名作用域，见下文「已知风险与限制」 |

---

## 功能简介

dsh 的「设置 → 插件」里，官方自带的 `@deepseek-ai/*` 插件和通过 `dsh plugin add` 安装的第三方插件混在一起，难以分辨。本插件：

1. 新增 `/plugin-audit` 人类命令（Web 聊天、任何交互式 UI 适配器），输出「官方 / 自装」分组列表，支持过滤。
2. 在「设置 → 插件」里新增「来源」tab，卡片化分组展示，带来源徽标与搜索框。

**示例输出**（对真实 profile 运行 `node demo/classify-profile.mjs`）：

```
插件来源分类（官方 vs 自装）
总计 134：官方 129 · 自装 5 · 内置 0

── 自装插件（5）──
  [已启用] dsh-at-file · 自装 · entry=dsh-at-file · 在 profile dependencies / extraUserPackages 中显式安装
  [已启用] @omdsh-dev/dsh-genui · 自装 · entry=genui · …显式安装
  [已启用] @dsh-external/dsh-automation · 自装 · entry=dsh-automation · …显式安装
  [已启用] dsh-better-sidebar · 自装 · entry=better-sidebar · …显式安装
  [已启用] @liustack/modlens · 自装 · entry=modlens · …显式安装

── 官方插件（129）──
  全部位于 @deepseek-ai/ 官方发行作用域（共 129 个）。
```

---

## 快速上手（四步）

前置：`pnpm`（profile 已声明 `packageManager: pnpm`）、`dsh` CLI。

### 第 1 步：安装

```sh
dsh plugin --profile web add https://github.com/tttwh/dsh-plugin-audit/archive/refs/heads/main.tar.gz
```

确认已进 bundle 列表：

```sh
cat ~/.dsh/profiles/web/package.json   # dsh.profile.bundles 末尾应多出 "dsh-plugin-audit"
```

> 本地开发 / 边改边试：`cd dsh-plugin-audit && dsh plugin --profile web add link:$(pwd)`，改完 `npm run build` 后重启。

### 第 2 步：重启 Web

`dsh plugin add` 只改配置，**正在运行的服务器不会自动加载新 bundle**（HMR 只盯 `cordis.patch.yml`，不盯 bundle 列表）。停掉当前 `dsh web` 进程，再 `dsh web` 重启。

### 第 3 步：用命令

聊天框输入：

| 输入 | 效果 |
|---|---|
| `/plugin-audit` | 概览：自装逐行 + 官方计数 |
| `/plugin-audit user` | 只看自装 |
| `/plugin-audit official` | 只看官方（逐行） |
| `/plugin-audit modlens` | 按包名 / entry 关键词过滤 |

### 第 4 步：看设置页

设置 → 插件 → 新增的「来源」tab（与「插件配置 / 插件列表」并列），卡片按「自装 / 官方」分组，带来源徽标 + 搜索框。

### 卸载

```sh
dsh plugin --profile web remove dsh-plugin-audit
```

或 `cd ~/.dsh/profiles/web && pnpm remove dsh-plugin-audit`。卸载后重启即完全恢复原状（本插件没改过任何官方 bundle）。

---

## 开发 / 构建

```sh
npm install
npm run build        # esbuild 产出 lib/index.js（host）+ lib/client.js（client）+ lib/classify.js、lib/render.js
npm run typecheck    # tsc --noEmit
npm test             # vitest run
```

> `lib/`（构建产物）**需要提交进仓库**：GitHub tarball 安装（`dsh plugin add <tarball>`）在安装时不构建，直接读取仓库里已构建好的 `lib/`。

---

## 设计问答（三个关键问题）

### 1. Web UI 插件列表是否支持第三方扩展改分组/过滤？

**可以「新增一个 tab」做分组，但不能改官方自带的「插件列表」tab。** 依据（源码/README）：

- `@deepseek-ai/dsh-client-ui-settings-plugins`：把 `settings.plugins.tab` 声明为**根级 list 插槽**，任何插件都能注册自己的 tab。
- `@deepseek-ai/dsh-client-ui-settings-plugin-inventory`（官方「插件列表」tab）的 Known Limitations 明确把 **grouping by source** 列为未完成项，且其组件对 entry id「is never classified by string shape」。
- `@deepseek-ai/dsh-api-remotes`：客户端装配里已挂载 `pluginInventory/list` remote，返回每个条目的 `entryId / moduleName / enabled / fiberPhase`。
- `@deepseek-ai/dsh-host-plugin-inventory`：明确**不暴露 provenance**（不识别由哪个 bundle/profile 引入），所以来源只能从 `moduleName`（包名）推导。

### 2. 替代方案与取舍

| 方案 | 入口 | 优点 | 代价 |
|---|---|---|---|
| **/plugin-audit 命令（本插件）** | Web 聊天 / 交互式适配器 | 读 `ctx.loader.entries()`，数据最权威；零构建；完全可逆 | 不在设置页；非交互 headless 无命令适配器 |
| **「来源」tab（本插件 client 半边）** | 设置 → 插件 | 正好在设置页 | 需要 esbuild 产出浏览器打包；只能用作用域规则 |
| CLI 命令 | 终端 | 无 UI 也能看 | 需注入 cmdlineArgs + commander + 退出控制，样板多 |

### 3. 来源判定规则与边界

判定信号 = 条目的模块说明符（包名）。规则自上而下命中即返回：

1. `cordis:` 前缀 → 内置；
2. 包名在「用户显式安装集」（profile `dependencies` ∪ `config.extraUserPackages`）→ 自装（**优先于作用域**）；
3. `@deepseek-ai/` 前缀 → 官方；
4. 其余 → 自装。

边界处理：**用户装了 `@deepseek-ai/` 前缀的第三方包** → 规则 2 覆盖，归自装；**官方 bundle 升级新增插件** → 仍在该作用域，自动归官方，无需维护名单。

---

## 已知风险与限制

- **只读**：不改任何插件的启用/配置/加载；不影响原有插件功能。
- **判定依赖包名作用域**：官方 host 不暴露 bundle provenance，故以 `@deepseek-ai/` 作用域为准。极少数「他人伪造官方作用域包」需用 `extraUserPackages` 覆盖。
- **多 profile**：host 侧 `readUserDependencies` 扫描 `$DSH_HOME/profiles/*` 的依赖并集（单 profile 时与真实一致）；多 profile 时用 `extraUserPackages` 显式声明。
- **「来源」tab 用作用域规则**：client 侧读不到 profile 依赖，判定口径与命令一致但无依赖覆盖。
- **兼容性**：依赖 dsh 默认 web bundle 提供的 `loader`/`commands`（host）与 `remote.pluginInventory`/`settings.plugins.tab`（client）。
