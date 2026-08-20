// @file src/updates.ts
// @description 自装插件「检查更新 / 执行更新」的共享逻辑（host 侧）。
//
// 设计（v0.6，参照 @linxin666/dsh-remote-web-ui 的自更新通道）：
//   - 检查：读 profile node_modules 里每个包的已装版本，用 web.fetch 探测
//     npm registry 的 latest，semver 比较得到 outdated；纯只读，无副作用；
//   - 执行：在 profile 目录跑 `pnpm update <pkg>...`（corepack/npx 兜底），
//     与 dsh-remote-web-ui 的 runUpdate 同款（它已在本机验证可行）；
//   - 安全边界与 toggle 一致：只允许操作 origin === 'user' 的自装插件，
//     官方/内置拒绝；不能更新本插件自身（dsh-plugin-diraud 用 link: 装在工作区，
//     pnpm update 会破坏开发链路）。
//
// 本模块只依赖注入的最小 seam（web fetch、subprocess spawn、fs 读取、profile
// 目录），不 import cordis，方便单测。

import type { UpdateStatus } from './contract';

/** 版本比较：a > b 返回正数，a === b 返回 0，a < b 返回负数。 */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] as number;
    const vb = pb[i] as number;
    if (va !== vb) return va - vb;
  }
  // 主/次/补丁相同：带预发布后缀的版本视为更旧（1.0.0-rc.1 < 1.0.0）。
  const hasPreA = pa[3] !== null;
  const hasPreB = pb[3] !== null;
  if (hasPreA === hasPreB) return 0;
  return hasPreA ? -1 : 1;
}

/** 解析 semver 为 [major, minor, patch, prerelease?]；非法输入降级为全 0。 */
function parseVersion(v: string): [number, number, number, string | null] {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(v.trim());
  if (!m) return [0, 0, 0, null];
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ?? null];
}

/** web.fetch 服务的最小 seam（仅 URL → JSON）。 */
export interface FetchSeam {
  fetchJson(url: string): Promise<{ ok: boolean; json: unknown }>;
}

/** fs 读取 seam：读 package.json 返回对象，失败返回 undefined。 */
export interface ReadManifestSeam {
  readPackageJson(moduleName: string): Promise<{ version: string } | undefined>;
}

/** subprocess seam：在 cwd 跑一条命令，收集输出，返回退出码（null=异常终止）。 */
export interface SpawnSeam {
  run(
    command: string,
    args: string[],
    cwd: string,
  ): Promise<{ exitCode: number | null; output: string; spawnError?: string }>;
}

/** updates 逻辑的全部依赖（供 executeCheckUpdates / executeUpdate 使用）。 */
export interface UpdatesDeps {
  /** 当前 profile 目录（pnpm 执行与 node_modules 解析的基准）。 */
  profileDir: string;
  /** 需要检查/更新的模块名列表（已按来源过滤的自装插件）。 */
  moduleNames: string[];
  fetch: FetchSeam;
  read: ReadManifestSeam;
  spawn: SpawnSeam;
  /** 执行更新的超时（毫秒，默认 10 分钟，与 remote-web-ui 一致）。 */
  timeoutMs?: number;
  /** registry 探测并发数；默认 6，避免串行等待，也避免一次压满连接池。 */
  checkConcurrency?: number;
}

const DEFAULT_CHECK_CONCURRENCY = 6;

/** npm registry 的 latest 元数据 URL（作用域包名需 URL 编码 `/`）。 */
export function registryLatestUrl(moduleName: string): string {
  return `https://registry.npmjs.org/${moduleName.replace('/', '%2F')}/latest`;
}

/**
 * 检查更新：限流并发读取已装版本、探测 registry、semver 比较。
 * 纯只读；单个包探测失败不中断整体，全部失败时标记 registryUnreachable。
 *
 * 不能串行：插件较多时，总耗时会变成每个 registry RTT 的总和；也不能直接
 * Promise.all 无上限并发，否则大型 profile 会瞬间占满 host 的网络连接池。
 * worker 池兼顾响应速度与资源占用，并按输入下标写回以保持 Loader 顺序。
 */
export async function executeCheckUpdates(deps: UpdatesDeps): Promise<{
  packages: UpdateStatus[];
  registryUnreachable: boolean;
}> {
  const packages = new Array<UpdateStatus>(deps.moduleNames.length);
  let probeFailures = 0;
  let nextIndex = 0;
  const configuredConcurrency = deps.checkConcurrency ?? DEFAULT_CHECK_CONCURRENCY;
  const requestedConcurrency = Number.isFinite(configuredConcurrency)
    ? Math.floor(configuredConcurrency)
    : DEFAULT_CHECK_CONCURRENCY;
  const concurrency = Math.max(1, Math.min(requestedConcurrency, deps.moduleNames.length));

  const checkOne = async (moduleName: string, index: number): Promise<void> => {
    const manifest = await deps.read.readPackageJson(moduleName);
    const currentVersion = manifest?.version ?? '';
    let latestVersion: string | null = null;
    let error: string | null = null;
    try {
      const result = await deps.fetch.fetchJson(registryLatestUrl(moduleName));
      if (!result.ok) {
        error = `registry 返回异常状态`;
        probeFailures++;
      } else {
        const body = result.json;
        if (typeof body === 'object' && body !== null && typeof (body as { version?: unknown }).version === 'string') {
          latestVersion = (body as { version: string }).version;
        } else {
          error = 'registry 响应缺少 version 字段';
          probeFailures++;
        }
      }
    } catch {
      error = 'registry 探测失败（网络不可达？）';
      probeFailures++;
    }
    const outdated =
      latestVersion !== null && currentVersion !== '' && compareVersions(latestVersion, currentVersion) > 0;
    packages[index] = { moduleName, currentVersion, latestVersion, outdated, error };
  };

  const worker = async (): Promise<void> => {
    while (nextIndex < deps.moduleNames.length) {
      const index = nextIndex++;
      await checkOne(deps.moduleNames[index] as string, index);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return {
    packages,
    registryUnreachable: probeFailures === deps.moduleNames.length && deps.moduleNames.length > 0,
  };
}

/** 执行更新的候选命令链：pnpm → corepack pnpm → npx pnpm（同 remote-web-ui）。
 * 用 `add <pkg>@latest` 并把依赖强制改写为 registry 最新版本（同步子依赖）。
 *
 * 为什么加 `--config.minimumReleaseAge=0`（v0.6 实测）：pnpm 11 的 supply-chain
 * 默认 minimumReleaseAge=1 天，会拦截「发布不足 1 天」的新版本（本 profile 的
 * pnpm-workspace.yaml 的 minimumReleaseAgeExclude 只排除了 0.1.10 等旧版）。
 * 被拦时 pnpm 把 `@latest` 降级解析到「发布够久」的旧版（如 0.1.16 而非 0.1.19），
 * 甚至输出 "Already up to date"——env 变量 `npm_config_minimumReleaseAge` 无效，
 * 必须用 CLI `--config.minimumReleaseAge=0`（实测生效：0.1.16 → 0.1.19）。
 * 多包一次传参可一起升级。 */
function updateCandidates(moduleNames: string[]): Array<{ command: string; args: string[] }> {
  const specs = moduleNames.map((name) => `${name}@latest`);
  // append-only 避免动态进度输出给 collect 管道制造额外刷新压力；不能使用
  // prefer-offline，因为它可能复用过期 registry 元数据，反而错过刚发现的最新版。
  const flags = ['--config.minimumReleaseAge=0', '--reporter=append-only'];
  return [
    { command: 'pnpm', args: ['add', ...specs, ...flags] },
    { command: 'corepack', args: ['pnpm', 'add', ...specs, ...flags] },
    { command: 'npx', args: ['--yes', 'pnpm', 'add', ...specs, ...flags] },
  ];
}

/**
 * 执行更新：在 profile 目录跑 pnpm update（corepack/npx 兜底）。
 * 返回退出码与截断输出；命令不存在时依次尝试下一个候选。
 */
export async function executeUpdate(
  deps: UpdatesDeps,
): Promise<{ ok: boolean; exitCode: number | null; output: string; error: string | null }> {
  const candidates = updateCandidates(deps.moduleNames);
  let output = '';
  for (const candidate of candidates) {
    const result = await deps.spawn.run(candidate.command, candidate.args, deps.profileDir);
    output += (output.length === 0 ? '' : '\n') + `$ ${candidate.command} ${candidate.args.join(' ')}\n` + result.output;
    if (output.length > 16 * 1024) output = output.slice(output.length - 16 * 1024);
    if (result.spawnError !== undefined) continue; // 命令不存在 → 下一个候选
    if (result.exitCode === 0) {
      return { ok: true, exitCode: 0, output, error: null };
    }
    return { ok: false, exitCode: result.exitCode, output, error: `pnpm exited with code ${String(result.exitCode)}` };
  }
  return {
    ok: false,
    exitCode: null,
    output,
    error: 'pnpm not found on PATH (tried pnpm, corepack, npx); install pnpm and restart the app',
  };
}
