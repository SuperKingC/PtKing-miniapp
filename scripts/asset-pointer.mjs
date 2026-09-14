import fs from 'node:fs'
export {
  CHANNEL_NAME_RE,
  pickGitChannelTag,
  pickPreferredGitTag,
  readChannelArg,
  readGitChannelHints,
  resolveChannelName,
} from '../../miniapp-kit/cos/git-channel.mjs'

/** 解析 .asset-base-url 这类「域名 + prefix + version」玩家指针 */
export function parseAssetPointer(raw) {
  const trimmed = String(raw || '').trim().replace(/\/$/, '')
  const url = new URL(trimmed)
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length < 2) throw new Error(`无法解析 COS 版本目录: ${trimmed}`)
  const version = parts.pop()
  const prefix = parts.join('/')
  return {
    raw: trimmed,
    origin: url.origin,
    prefix,
    version,
    base: `${url.origin}/${prefix}/${version}`,
  }
}

export function readAssetPointer(file) {
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, 'utf8').trim()
  if (!raw) return null
  return parseAssetPointer(raw)
}
