/**
 * 塔罗远程资源的本地持久化缓存：downloadFile 的临时文件 saveFile 落盘，
 * URL → 本地路径 映射存 storage，渲染侧命中即免网络。
 *
 * 关键事实：
 * - downloadFile 返回的 tempFilePath 只在本次会话有效，必须在成功后立刻 saveFile
 *   才能跨会话复用；否则每次进入都要重下整批 24 张（4MB 级）。
 * - 缓存按资产版本根(base)分段：换域名 / COS 升版后 URL 变化，base 不同即清空旧文件，
 *   避免历史版本文件堆积。
 * - node/vitest 无 wx 时全部走空实现，调用方自行兜底（渲染回退远程 URL）。
 */
import { getWxGlobal, type WxFileSystemManager } from '../../services/wxGlobal'

const CACHE_STORAGE_KEY = 'ptking_tarot_asset_cache'

interface TarotAssetCacheRecord {
  /** 建档时的资产版本根；与当前 base 不符则整档作废。 */
  base: string
  /** 远程 URL → 本地已落盘路径。 */
  files: Record<string, string>
}

let memoryRecord: TarotAssetCacheRecord | null = null

function emptyRecord(): TarotAssetCacheRecord {
  return { base: '', files: {} }
}

function readRecord(): TarotAssetCacheRecord {
  if (memoryRecord) return memoryRecord
  try {
    const raw = getWxGlobal()?.getStorageSync?.(CACHE_STORAGE_KEY)
    if (raw && typeof raw === 'object') {
      const candidate = raw as Partial<TarotAssetCacheRecord>
      if (typeof candidate.base === 'string' && candidate.files && typeof candidate.files === 'object') {
        memoryRecord = { base: candidate.base, files: { ...candidate.files } }
        return memoryRecord
      }
    }
  } catch {
    // 读失败退回空缓存：本次仍可下载，只是无法复用历史
  }
  memoryRecord = emptyRecord()
  return memoryRecord
}

function writeRecord(record: TarotAssetCacheRecord): void {
  memoryRecord = record
  try {
    getWxGlobal()?.setStorageSync?.(CACHE_STORAGE_KEY, record)
  } catch {
    // 写失败只影响下次启动复用，不阻断本次会话
  }
}

function fileSystem(): WxFileSystemManager | undefined {
  try {
    return getWxGlobal()?.getFileSystemManager?.()
  } catch {
    return undefined
  }
}

function fileExists(path: string): boolean {
  const fs = fileSystem()
  if (!fs?.accessSync) return false
  try {
    fs.accessSync(path)
    return true
  } catch {
    // 被系统回收 / 已删除
    return false
  }
}

function removeFile(path: string): void {
  try {
    fileSystem()?.unlinkSync?.(path)
  } catch {
    // 文件可能已不存在
  }
}

/** 该 URL 是否已有可用本地副本。 */
export function isTarotAssetCached(url: string): boolean {
  if (!url) return false
  const path = readRecord().files[url]
  return Boolean(path) && fileExists(path)
}

/** 渲染用：命中缓存返回本地路径，否则原样返回远程 URL。 */
export function resolveTarotAssetUrl(url: string): string {
  if (!url) return url
  const path = readRecord().files[url]
  return path && fileExists(path) ? path : url
}

/** 资产版本根变化时清空旧缓存（含已落盘文件），返回是否发生了重置。 */
export function resetTarotAssetCacheIfBaseChanged(base: string): boolean {
  const record = readRecord()
  if (record.base === base) return false
  for (const path of Object.values(record.files)) removeFile(path)
  writeRecord({ base, files: {} })
  return true
}

/** 把 downloadFile 的临时文件持久化并登记映射；返回是否落盘成功。 */
export function saveTarotAssetFromTemp(url: string, tempFilePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const fs = fileSystem()
    if (!fs?.saveFile) {
      resolve(false)
      return
    }
    try {
      fs.saveFile({
        tempFilePath,
        success: (result) => {
          const savedPath = result?.savedFilePath
          if (!savedPath) {
            resolve(false)
            return
          }
          const record = readRecord()
          const previous = record.files[url]
          // 同 URL 重新落盘时清掉旧副本，避免孤儿文件
          if (previous && previous !== savedPath) removeFile(previous)
          record.files[url] = savedPath
          writeRecord(record)
          resolve(true)
        },
        fail: () => resolve(false),
      })
    } catch {
      resolve(false)
    }
  })
}

/** 换肤 / 测试重置用：清空映射与所有已落盘文件。 */
export function clearTarotAssetCache(): void {
  const record = readRecord()
  for (const path of Object.values(record.files)) removeFile(path)
  writeRecord(emptyRecord())
  // 置空内存档，让下次读取重新走 storage（换环境 / 测试重置时避免读到旧档）
  memoryRecord = null
}
