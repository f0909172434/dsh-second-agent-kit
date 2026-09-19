// Read-only subset of kenz1117/dsh-engram a7639b559e95361fbc0f1dd8723714e77b4b17d6.
// MIT; see ENGRAM-LICENSE. Migration code deliberately excluded.
/**
 * 项目标识：git origin URL 归一化 → sha256 短哈希分库名；无 git 或无 origin 时
 * 回退 cwd 编码（v0.4 现状算法）。纯文件读（.git/config、worktree 的 gitdir/commondir
 * 指针），不起子进程。启动时负责旧库文件向新标识的 rename 迁移。
 * @module @kenz1117/dsh-engram/project/identity
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** 项目标识解析结果。 */









/** 迁移结果：renamed = 旧库已改名；kept-both = 新旧并存未动；none = 无需迁移。 */


/** v0.4 旧命名：cwd 的 hex 编码前 24 位（只覆盖 cwd 前 12 字符，同前缀目录会撞库）。保留仅供迁移识别。 */
export function legacyProjectDbName(cwd        )         {
  return `project-${Buffer.from(cwd).toString('hex').slice(0, 24)}.db`
}

/**
 * 无 git 时的 cwd 命名：cwd 全量 sha256 前 24 位。
 * 旧算法只取 cwd 前 12 字符，`C:\Users\Adm…` 这类同前缀目录会共用同一个库；
 * 新算法对每个目录唯一，启动时把旧库 rename 迁移到新名（见 migrateProjectDb）。
 */
export function cwdProjectDbName(cwd        )         {
  return `project-${createHash('sha256').update(cwd).digest('hex').slice(0, 24)}.db`
}

/**
 * 归一化 git origin URL：去协议与凭证、host 小写、去尾部 `.git` 与 `/`，
 * 使 `git@github.com:a/b.git` 与 `https://github.com/a/b` 等价。无法解析返回 undefined。
 */
export function normalizeOriginUrl(raw        )                     {
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  // SCP-like 形式（git@host:path）：host 取 @ 与 : 之间，路径取 : 之后。
  const scp = /^[^@\s]+@([^:\s]+):(.+)$/.exec(trimmed)
  let host
  let path
  if (scp !== null) {
    host = scp[1]
    path = scp[2]
  } else {
    // 无协议的裸 host/path 补 https:// 以便 URL 解析（凭证由解析器自动剥离）。
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
    try {
      const url = new URL(withScheme)
      host = url.host
      path = url.pathname
    } catch {
      return undefined
    }
  }
  // 统一成 `host/path`：SCP 形式的路径不带前导 /，URL 形式的带，先剥再拼。
  const normalizedPath = path.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.git$/, '').replace(/\/+$/, '')
  if (host === '' || normalizedPath === '') return undefined
  return `${host.toLowerCase()}/${normalizedPath}`
}

/**
 * 定位真 git config：`.git` 为目录时取其 config；为文件（worktree/submodule）时
 * 沿 `gitdir:` 指针找到 gitdir，再沿其中的 `commondir` 指针回到主 git 目录。
 * 任一环节缺失返回 undefined。
 */
export function resolveGitConfigPath(cwd        )                     {
  const dotGit = join(cwd, '.git')
  let stat
  try {
    stat = statSync(dotGit)
  } catch {
    return undefined
  }
  if (stat.isDirectory()) {
    return existsSync(join(dotGit, 'config')) ? join(dotGit, 'config') : undefined
  }
  if (!stat.isFile()) return undefined
  const pointer = /^gitdir:\s*(.+)$/m.exec(readFileSync(dotGit, 'utf8'))
  if (pointer === null) return undefined
  const gitdir = resolve(cwd, pointer[1] .trim())
  // worktree 的 gitdir 是主仓库 .git/worktrees/<name>，真 config 在 commondir 指向的主 git 目录。
  let common = gitdir
  try {
    const commondir = readFileSync(join(gitdir, 'commondir'), 'utf8').trim()
    if (commondir !== '') common = resolve(gitdir, commondir)
  } catch {
    // 无 commondir 文件：gitdir 即真 git 目录（如 submodule 场景）。
  }
  const configPath = join(common, 'config')
  return existsSync(configPath) ? configPath : undefined
}

/** 从 git config 文本提取 `[remote "origin"]` 段的 url（手写 INI 行解析，不引依赖）。 */
export function readOriginUrl(configPath        )                     {
  let text
  try {
    text = readFileSync(configPath, 'utf8')
  } catch {
    return undefined
  }
  let inOrigin = false
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[')) {
      inOrigin = /^\[remote\s+"origin"\]$/i.test(trimmed)
      continue
    }
    if (inOrigin) {
      const entry = /^url\s*=\s*(.+)$/.exec(trimmed)
      if (entry !== null) return entry[1] .trim()
    }
  }
  return undefined
}

/**
 * 解析项目标识：origin URL 归一化后取 sha256 hex 前 24 位；无 git、无 origin
 * 或 URL 无法解析时回退 cwd 全量哈希命名。
 */
export function resolveProjectIdentity(cwd        )                  {
  const legacyDbName = legacyProjectDbName(cwd)
  const configPath = resolveGitConfigPath(cwd)
  const origin = configPath === undefined ? undefined : readOriginUrl(configPath)
  const normalized = origin === undefined ? undefined : normalizeOriginUrl(origin)
  if (normalized === undefined) return { dbName: cwdProjectDbName(cwd), source: 'cwd', legacyDbName }
  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 24)
  return { dbName: `project-${hash}.db`, source: 'origin', legacyDbName }
}
