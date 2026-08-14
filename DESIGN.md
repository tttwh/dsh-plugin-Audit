# DESIGN.md — 设计背景与查证依据

本插件开发前先回答的三个关键问题的完整记录（公开 README 只保留结论，细节在这里）。

## 1. Web UI 插件列表是否支持第三方扩展改分组/过滤？

**可以「新增一个 tab」做分组，但不能改官方自带的「插件列表」tab。** 依据（源码/README）：

- `@deepseek-ai/dsh-client-ui-settings-plugins`：把 `settings.plugins.tab` 声明为**根级 list 插槽**，任何插件都能注册自己的 tab（不同 id 并列）。
- `@deepseek-ai/dsh-client-ui-settings-plugin-inventory`（官方「插件列表」tab）的 Known Limitations 明确把 **grouping by source** 列为未完成项，且其组件对 entry id「is never classified by string shape」。
- `@deepseek-ai/dsh-api-remotes`：客户端装配里已挂载 `pluginInventory/list` remote，返回每个条目的 `entryId / moduleName / enabled / fiberPhase`。
- `@deepseek-ai/dsh-host-plugin-inventory`：明确**不暴露 provenance**（不识别由哪个 bundle/profile 引入），所以来源只能从 `moduleName`（包名）推导。
- `@deepseek-ai/dsh-client-ui-slots`：list 型插槽要求唯一 `id`，不同 id 的注册互不冲突。

## 2. 替代方案与取舍

| 方案 | 入口 | 优点 | 代价 |
|---|---|---|---|
| **/plugin-audit 命令（本插件）** | Web 聊天 / 交互式适配器 | 读 `ctx.loader.entries()`，数据最权威；零构建；完全可逆 | 不在设置页；非交互 headless 无命令适配器 |
| **「来源」tab（本插件 client 半边）** | 设置 → 插件 | 正好在设置页 | 需要 esbuild 产出浏览器打包；只能用作用域规则 |
| CLI 命令 | 终端 | 无 UI 也能看 | 需注入 cmdlineArgs + commander + 退出控制，样板多 |

## 3. 来源判定规则与边界

判定信号 = 条目的模块说明符（包名）。规则自上而下命中即返回（实现见 `src/classify.ts`）：

1. `cordis:` 前缀 → 内置；
2. 包名在「用户显式安装集」（profile `dependencies` ∪ `config.extraUserPackages`）→ 自装（**优先于作用域**）；
3. `@deepseek-ai/` 前缀 → 官方；
4. 其余 → 自装。

**边界处理**：

- 用户恰好装了 `@deepseek-ai/` 前缀的第三方包 → 规则 2 覆盖，归自装。
- 官方 bundle 升级新增插件 → 仍在该作用域，自动归官方，无需维护名单（这是作用域规则相对「硬编码官方名单」的关键优势）。
- 多 profile 场景：host 侧 `readUserDependencies` 扫描 `$DSH_HOME/profiles/*` 的依赖并集（单 profile 时与真实一致）；多 profile 时用 `extraUserPackages` 显式声明（它是权威覆盖）。

## 验证方式

- 单元测试：`npm test`（`tests/classify.test.ts`，7 个用例）。
- 离线复现真实 profile 分组：`node demo/classify-profile.mjs`（读取 bundle 的 `cordis.patch.yml`，输出「官方 / 自装」分组）。
- host 端到端冒烟：`node demo/smoke.mjs`（mock ctx 验证 apply → 注册命令 → 渲染链路）。
