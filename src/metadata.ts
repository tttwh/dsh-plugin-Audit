// @file src/metadata.ts
// @description 从 package.json repository/homepage 提取可信的 GitHub 仓库主页。

/** package.json 的 repository 既可能是字符串，也可能是 { type, url }。 */
export type RepositoryField = string | { type?: unknown; url?: unknown } | null | undefined;

function repositoryText(value: RepositoryField): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value !== null && typeof value.url === 'string') return value.url.trim();
  return '';
}

/** 把 npm 常见的 git URL 形式归一化为 https://github.com/owner/repo。 */
export function normalizeGitHubUrl(value: RepositoryField): string | null {
  let raw = repositoryText(value);
  if (raw === '') return null;
  raw = raw
    .replace(/^github:/i, 'https://github.com/')
    .replace(/^git\+/, '')
    .replace(/^git@github\.com:/i, 'https://github.com/')
    .replace(/^ssh:\/\/git@github\.com\//i, 'https://github.com/');
  if (!/^https?:\/\//i.test(raw)) return null;

  try {
    const url = new URL(raw);
    if (!['github.com', 'www.github.com'].includes(url.hostname.toLocaleLowerCase())) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repository = parts[1].replace(/\.git$/i, '');
    if (owner === '' || repository === '') return null;
    return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
  } catch {
    return null;
  }
}

/** repository 优先；缺失时接受确实指向 GitHub 的 homepage。 */
export function resolveGitHubUrl(repository: RepositoryField, homepage: unknown): string | null {
  return normalizeGitHubUrl(repository) ?? normalizeGitHubUrl(typeof homepage === 'string' ? homepage : undefined);
}
