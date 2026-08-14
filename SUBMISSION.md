# [Plugin] dsh-plugin-audit — 按来源区分官方插件与自装插件

> 投稿到 `omdsh-dev/community` 的 **Show and tell** 讨论帖（标题以 `[Plugin]` 开头）。

## 插件名称与仓库地址

- 名称：`dsh-plugin-audit`
- 仓库：https://github.com/tttwh/dsh-plugin-audit

## 功能简介及与 DeepSeek 的关系

面向 DeepSeek Harness（dsh）的插件管理增强。dsh 官方自带约 129 个 `@deepseek-ai/*` 插件，与用户通过 `dsh plugin add` 安装的第三方插件混在同一个列表里，难以分辨。本插件**不改动任何官方 bundle**，提供：

1. `/plugin-audit` 命令：按「官方 / 自装」分组列出当前已加载插件，支持 `user` / `official` / 关键词过滤；
2. 设置 → 插件 → 「来源」tab：卡片化分组展示，带来源徽标与搜索框。

## 安装与使用

```sh
dsh plugin --profile web add https://github.com/tttwh/dsh-plugin-audit/archive/refs/heads/main.tar.gz
```

装完重启 `dsh web`，聊天框输入 `/plugin-audit`，或打开 设置 → 插件 → 「来源」。

## 开源许可证与版权

- 许可证：MIT License
- 版权：Copyright (c) 2025 tttwh

## 维护状态与维护者

- 状态：活跃维护（单人项目）
- 主要维护者：tttwh

## 已知风险、限制与兼容性

- 只读展示，不改任何插件的启用/配置/加载，不影响原有插件功能；
- 来源判定基于包名作用域（官方 host 不暴露 bundle provenance）：`@deepseek-ai/` 判官方、其余判自装；极端情况可用 `extraUserPackages` 覆盖；
- 依赖默认 web profile 提供的 `loader`/`commands`（host）与 `remote.pluginInventory`/`settings.plugins.tab`（client）；
- 一条命令卸载：`dsh plugin --profile web remove dsh-plugin-audit`。
