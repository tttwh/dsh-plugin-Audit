// @file demo/smoke.mjs
// @description 冒烟测试：用最小 mock 的 ctx，端到端验证 host 插件的
//              apply → 注册 /plugin-audit → 执行 → 渲染 这条链路。
//              不依赖真实 dsh 环境，可随时运行。
// 运行（先构建一次）：npm run build && node demo/smoke.mjs

import { apply } from '../lib/index.js';

// 最小 mock：模拟 ctx.loader.entries() 与 ctx.commands.register()。
const fakeEntries = [
  { id: 'timer', options: { name: '@deepseek-ai/cordis-plugin-timer' }, disabled: false },
  { id: 'dsh-at-file', options: { name: 'dsh-at-file' }, disabled: false },
  { id: 'modlens', options: { name: '@liustack/modlens' }, disabled: false },
  { id: 'group-row', options: { name: 'whatever', group: true }, disabled: false }, // 应被跳过
];

const registered = [];
const ctx = {
  loader: { entries: () => fakeEntries[Symbol.iterator]() },
  commands: { register: (def) => { registered.push(def); } },
};

// 调用插件入口（无 config → 使用默认值；readUserDependencies 会尽力扫描 $DSH_HOME，
// 但 mock 的 entries 已固定，扫描结果不影响这 4 条假数据）。
apply(ctx, {});

console.log('注册的命令数量:', registered.length);
console.log('命令名:', registered[0].name);

const result = registered[0].handler({ rawInput: '' });
console.log('');
console.log('── /plugin-audit 输出（mock 数据）──');
console.log(result.text);
