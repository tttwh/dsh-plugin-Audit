// @file src/translations.ts
// @description 插件的双语描述字典（host 侧内置）。
//
// 为什么需要它（v0.6 用户需求「卡片介绍中英文随系统更改」）：
//   - 各插件的 package.json description 大多是英文（官方插件尤甚），中文系统下
//     卡片显示英文，与「随系统语言」的需求不符；
//   - 这里维护一份「模块名 → { zh, en }」的翻译表，覆盖本 profile 常见自装插件
//     与常用官方插件；host 的 descriptions 端点优先查表，查不到再回退到
//     package.json 原文（en=原文，zh=原文，即英文显示，不丢信息）；
//   - 表为「尽力覆盖」而非全量：官方插件有 190+ 个，只翻译用户常用的一批，
//     其余包名走回退（英文原文）。
//
// 纯数据模块，host / client 逻辑都不 import 它（只被 runtime 的翻译函数引用）。

/** 一个包的中英描述。 */
export interface LocalizedText {
  zh: string;
  en: string;
}

/** 内置字典：moduleName → 中英描述。key 与 npm 包名精确匹配。 */
export const DESCRIPTION_DICT: Record<string, LocalizedText> = {
  // ── 自装插件 ──────────────────────────────────────────────
  'dshmarket': {
    zh: 'DSH 可视化插件市场：浏览、搜索并一键安装社区插件。',
    en: 'Visual plugin market inside DeepSeek Harness — browse, search, and one-click install community plugins.',
  },
  'dsh-at-file': {
    zh: 'Codex 风格 @文件 提及：在输入框输入 @ 即可搜索工作区文件并附加到提示词。',
    en: 'Codex-style @file mentions: type @ in the composer to search workspace files and attach them to the prompt.',
  },
  '@omdsh-dev/dsh-drag-and-drop': {
    zh: '把本地文件拖入 DSH Web 界面，直接插入原始文件路径，无需上传或复制。',
    en: 'Drag local files into the DSH Web UI and insert their original filesystem paths without uploading or copying.',
  },
  '@omdsh-dev/dsh-genui': {
    zh: 'GenUI：在回复中通过 dsh-ui 围栏内联渲染交互式 UI 组件——布局、图表、表单、测验、mermaid、3D 场景，并支持返回模型的动作事件。',
    en: 'GenUI for DeepSeek Harness: interactive UI components rendered inline in assistant replies via the dsh-ui fence — layout, charts, plots, forms, quizzes, mermaid, 3D scenes, and an action event loop back to the model.',
  },
  '@linxin666/dsh-client-ui-aionui-panel': {
    zh: 'DSH Web GUI 右侧面板系统：资源管理器 + 预览面板（文件树、文件名搜索、git 变更、10+ 格式多标签预览），由真实 host 侧 fs/git 服务驱动。',
    en: 'DSH web GUI right-panel system: Explorer + Preview columns (file tree, filename search, git changes, multi-tab preview of 10+ formats) driven by real host-side fs/git services.',
  },
  '@linxin666/dsh-client-ui-git-graph': {
    zh: 'DSH Web GUI 外部插件：会话头部上下文位的 git 分支选择器 + Git 图，带真实 host 侧 git 操作（切换/新建）与守卫。',
    en: 'A git branch selector + Git graph in the conversation header context hole, with real host-side git operations (switch/create) and guards.',
  },
  '@linxin666/dsh-client-ui-skin-center': {
    zh: 'GUI 内皮肤中心：列出官方默认与所有已安装皮肤，实时试穿（实际执行 client bundle，亮/暗预览），一键应用。',
    en: 'In-GUI skin center: lists the official default plus every installed skin, tries it on live inside the real GUI, and applies in one click.',
  },
  '@linxin666/dsh-client-ui-task-board': {
    zh: 'DSH Web GUI 任务看板：侧边栏入口 + 多列看板视图，本地持久化、任务详情，并通过 dsh 会话真实执行。',
    en: 'Task board for the dsh web GUI: a sidebar entry plus a multi-column kanban view with local persistence, task details, and real execution through dsh sessions.',
  },
  '@linxin666/dsh-client-ui-web-ui-settings': {
    zh: 'DSH 设置页的 Web UI 插件组：一个卡片承载 dsh-web-ui 家族插件的启用开关与配置表单。',
    en: 'Web UI plugin group for the dsh settings page: one card that hosts the dsh-web-ui family plugins enable switches and configuration forms.',
  },
  '@linxin666/dsh-liangshen': {
    zh: '梁神 agent 预设：两阶段锚定标准预设——首请求只暴露最小双工具面，推理就绪后切换到 Code Mode。',
    en: 'LiangShen agent preset: a two-phase anchored-standard preset — minimal two-tool surface first, then Code Mode (PTC).',
  },
  '@linxin666/dsh-live-stats': {
    zh: 'DSH Web 实时 token 估算与生成吞吐统计。',
    en: 'Live token estimates and generation throughput for DSH Web.',
  },
  '@linxin666/dsh-pet': {
    zh: '鲸鱼娘宠物插件：一只治愈系鲸鱼娘伙伴，随模型活动（空闲/等待/思考/工具/完成）反应，支持抚摸/喂食互动与好感度。',
    en: 'A soft healing whale-girl companion that reacts to model activity, with petting/feeding interactions and an affinity score.',
  },
  '@linxin666/dsh-remote-web-ui': {
    zh: 'DSH Web GUI 手机遥控：设置按钮旁扫码配对入口、一次性配对令牌、实时设备状态与可撤销的移动会话。',
    en: 'Mobile remote control for the dsh web GUI: scan-to-pair QR entry, one-time pairing tokens, live device status, and revocable mobile sessions.',
  },
  '@linxin666/dsh-skins': {
    zh: '皮肤全家桶聚合插件：皮肤中心 + 全部皮肤资产（qq98 / ths / xp / blue-fantasy / dragon-heir / minecraft / miku / trading 等）。',
    en: 'Skin bundle aggregator: skin center + all skin assets (qq98 / ths / xp / blue-fantasy / dragon-heir / minecraft / miku / trading, etc.).',
  },
  '@linxin666/dsh-ssh': {
    zh: 'DSH Web GUI 远程 SSH 操作：主机配置、ssh2 连接池与跳板支持、exec / 网页终端 / SFTP / 端口转发 / 集群执行，外加 agent 工具。',
    en: 'Remote SSH operations: host config store, persistent ssh2 connection pool with jump-host support, exec / PTY terminal / SFTP / tunnels / cluster execution, plus agent tools.',
  },
  '@linxin666/dsh-tool-describe-image': {
    zh: '模型侧 describe_image 工具：通过 OpenAI 兼容端点调用视觉语言模型，为纯文本模型提供单张图片的理解。',
    en: 'Model-facing describe_image tool: gives a text-only model image understanding by asking a vision-language model to describe one image.',
  },
  '@linxin666/dsh-web-ui-all': {
    zh: 'DSH Web UI 全家桶聚合插件：一键安装 task-board / git-graph / pet / remote-web-ui / live-stats / web-ui-settings 等功能插件 + 皮肤全家桶。',
    en: 'DSH Web UI aggregator: one-click install of task-board / git-graph / pet / remote-web-ui / live-stats / web-ui-settings + skins.',
  },
  '@liustack/modlens': {
    zh: '为纯文本 LLM 提供插件式视觉能力，由免费的 Antigravity CLI 驱动。',
    en: 'Plug-in vision for text-only LLMs, powered by the free Antigravity CLI.',
  },

  // ── 常用官方插件 ───────────────────────────────────────────
  '@deepseek-ai/dsh-llm': {
    zh: 'DeepSeek Harness 的提供商无关 LLM 服务接口。',
    en: 'Provider-neutral LLM service interface for the DeepSeek Harness.',
  },
  '@deepseek-ai/dsh-web': {
    zh: '抽象网络访问能力（ctx.web）：搜索/抓取提供者注册表、选择、请求/结果词表与 WebError 分类。',
    en: 'Abstract web access capability seam (ctx.web) — search/fetch provider registry and selection.',
  },
  '@deepseek-ai/dsh-session': {
    zh: 'DeepSeek Harness 的事件溯源会话存储。',
    en: 'Event-sourced session store for the DeepSeek Harness.',
  },
  '@deepseek-ai/dsh-tool-bash': {
    zh: '模型侧 bash 工具，支持可选的后台任务与沙箱提权。',
    en: 'Model-facing bash tool with optional generic background-job and sandbox-escalation support.',
  },
  '@deepseek-ai/dsh-commands': {
    zh: 'DeepSeek Harness UI 的插件所属人类命令注册表。',
    en: 'Plugin-owned human command registry for DeepSeek Harness UIs.',
  },
  '@deepseek-ai/dsh-agent': {
    zh: 'DeepSeek Harness 的 agent 接口、注册表、发起者作用域与事件词表。',
    en: 'Agent interface, registry, initiator scope, and event vocabulary for the DeepSeek Harness.',
  },
  '@deepseek-ai/dsh-settings': {
    zh: '抽象用户设置接口（ctx.settings）——设置项保存引用，提供者持有值。',
    en: 'Abstract user-settings seam (ctx.settings) for the DeepSeek Harness.',
  },
  '@deepseek-ai/dsh-credentials': {
    zh: '抽象凭据接口（ctx.credentials）：设置项引用秘密，提供者持有实际值。',
    en: 'Abstract credential seam (ctx.credentials): settings carry references to secrets, providers own the values.',
  },
  '@deepseek-ai/dsh-sandbox': {
    zh: '抽象进程沙箱接口（ctx.sandbox）：同世界隔离词表与权限提升。',
    en: 'Abstract process-sandbox seam (ctx.sandbox) for the DeepSeek Harness.',
  },
  '@deepseek-ai/dsh-subprocess': {
    zh: '子进程接口（ctx.subprocess）：受管进程组、有界溢出的输出收集与树级终止。',
    en: 'Subprocess seam (ctx.subprocess) — managed process groups, bounded spill-backed output.',
  },
  '@deepseek-ai/dsh-tools': {
    zh: 'DeepSeek Harness 的工具注册表与执行管线。',
    en: 'Tool registry and execution pipeline for the DeepSeek Harness.',
  },
  '@deepseek-ai/dsh-subagent': {
    zh: '抽象子 agent 接口（ctx.subagents）：委托给子 agent 的具名提供者注册表。',
    en: 'Abstract subagent seam (ctx.subagents): named-provider registry for delegating to child agents.',
  },
  '@deepseek-ai/dsh-skill': {
    zh: 'DeepSeek Harness 的 agent 技能提供者注册表。',
    en: 'Agent skill provider registry for the DeepSeek Harness.',
  },
  '@deepseek-ai/dsh-goal': {
    zh: 'DeepSeek Harness 的事件溯源同会话目标状态与生命周期服务。',
    en: 'Event-sourced same-session goal state and lifecycle service for the DeepSeek Harness.',
  },
  '@deepseek-ai/dsh-jobs-local': {
    zh: 'DeepSeek Harness 后台任务注册表接口的进程本地实现。',
    en: 'Process-local implementation of the DeepSeek Harness background job registry seam.',
  },
  '@deepseek-ai/dsh-session-persistence-jsonl': {
    zh: 'DeepSeek Harness 的 JSONL 持久会话存储后端。',
    en: 'JSONL durable session persistence backend for the DeepSeek Harness.',
  },
  '@deepseek-ai/dsh-attachment-local': {
    zh: 'DSH_HOME 的私有内容寻址附件存储。',
    en: 'Private content-addressed DSH_HOME attachment storage.',
  },
  '@deepseek-ai/dsh-typert-registry': {
    zh: '生成的包反射与 Zod schema 的运行时注册表。',
    en: 'Runtime registry for generated package reflection and Zod schemas.',
  },
  '@deepseek-ai/dsh-api-gateway': {
    zh: 'Typert Remote Host 分发器与客户端 API 端点。',
    en: 'Typert Remote Host dispatcher and Client API endpoint.',
  },
  '@deepseek-ai/dsh-host-webserver': {
    zh: 'Web 路由注册插件：HTTP 与升级路由、index 变换钩子与静态 dist 回退。',
    en: 'Web route-registration plugin: HTTP and upgrade routes, index transform taps, and static dist fallback.',
  },
  '@deepseek-ai/dsh-host-plugin-inventory': {
    zh: '当前 Cordis Loader 插件状态的只读 Remote 投影。',
    en: 'Read-only Remote projection of current Cordis Loader plugin state.',
  },
  '@deepseek-ai/cordis-plugin-timer': {
    zh: 'Cordis 计时器服务：定时、间隔与节流工具。',
    en: 'Cordis timer service: timeout, interval, and throttle helpers.',
  },
  '@deepseek-ai/dsh-approval': {
    zh: 'DeepSeek Harness 的用户审批服务：会话策略、回答者与审计记录。',
    en: 'Approval service that applies session policy before answerers and logs every ask/outcome pair.',
  },
  '@deepseek-ai/dsh-sandbox-policy': {
    zh: '沙箱策略服务：默认模式、工作区根与权限预设解析。',
    en: 'Sandbox-policy service: default mode, workspace root, and permission presets.',
  },
};

/**
 * 取一个包的双语描述：先查内置字典，查不到则用英文原文兜底（zh=en）。
 *
 * @param moduleName 模块名
 * @param fallbackEn package.json 读到的英文 description（可为空）
 * @returns { zh, en }
 */
export function localizeDescription(moduleName: string, fallbackEn: string): LocalizedText {
  const known = DESCRIPTION_DICT[moduleName];
  if (known !== undefined) return known;
  const en = fallbackEn || '';
  return { zh: en, en };
}
