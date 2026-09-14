/**
 * COS 热更修订号：写在 registry JSON 的 assetRev 字段。
 * 图仍用原文件名；下载 URL 带 ?r= 以避开 HTTP/本机按 URL 落盘的旧缓存。
 * 只改题库（assets:registry）不要写这个字段，避免无谓重下 24 张塔罗。
 */
import { getWxGlobal } from './wxGlobal'

const STORAGE_KEY = 'ptking_asset_rev'

export function readAssetRev(): string {
  try {
    const value = getWxGlobal()?.getStorageSync?.(STORAGE_KEY)
    return typeof value === 'string' ? value.trim() : ''
  } catch {
    return ''
  }
}

/** 记下本次 COS 修订号。返回是否相对本地有变化（调用方据此决定是否作废旧图缓存）。 */
export function rememberAssetRev(rev: unknown): boolean {
  if (typeof rev !== 'string') return false
  const next = rev.trim()
  if (!next) return false
  if (readAssetRev() === next) return false
  try {
    getWxGlobal()?.setStorageSync?.(STORAGE_KEY, next)
  } catch {
    // 写失败则本次会话仍可用 next 拼 URL，只是下次启动可能再刷一次
  }
  return true
}

/** 已记住修订号时给远程图加 ?r=，逼 downloadFile / CDN 把同名文件当新资源。 */
export function withAssetRev(url: string): string {
  const rev = readAssetRev()
  if (!rev || !url) return url
  const glue = url.includes('?') ? '&' : '?'
  return `${url}${glue}r=${encodeURIComponent(rev)}`
}
