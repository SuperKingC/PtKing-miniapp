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

/**
 * 会话级「URL → 已确认可用的本地路径」缓存。
 * 渲染层每帧、每张图都会调 resolveTarotAssetUrl；若每次都 getFileSystemManager + accessSync，
 * 进流程时会变成上千次跨进程同步 IO（实测 9 秒内 995 次），界面卡住像「加载完还等好久」。
 * 这里记住解析结果，一次会话内同一 URL 最多查一次磁盘。
 */
const resolvedPaths = new Map<string, string>()

/** getFileSystemManager 在开发者工具是跨进程调用，缓存实例避免重复获取。null = 尚未初始化。 */
let fsManager: WxFileSystemManager | undefined | null = null

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
  if (fsManager !== null) return fsManager
  try {
    fsManager = getWxGlobal()?.getFileSystemManager?.()
  } catch {
    fsManager = undefined
  }
  return fsManager
}

function removeFile(path: string): void {
  try {
    fileSystem()?.unlinkSync?.(path)
  } catch {
    // 文件可能已不存在
  }
}

/**
 * 该 URL 是否已有可用本地副本。
 *
 * 只查 storage 映射，不做磁盘存在性探测（accessSync 在开发者工具是跨进程同步调用，
 * 单次可达百毫秒，24 张就是数秒 —— 进入时逐条校验会把「缓存命中」拖成「等好几秒」）。
 * 安全性依据：saveFile 落盘的文件与 storage 映射属同一存储域，用户清小程序数据时
 * 两者一起消失；正常使用中不会出现「映射还在、文件没了」。真出现时由 Image onError
 * 兜底（见 invalidateTarotAsset）。
 */
export function isTarotAssetCached(url: string): boolean {
  if (!url) return false
  if (resolvedPaths.has(url)) return true
  const path = readRecord().files[url]
  if (!path) return false
  resolvedPaths.set(url, path)
  return true
}

/** 渲染用：命中缓存返回本地路径，否则原样返回远程 URL。只读 storage 映射，不做磁盘 IO。 */
export function resolveTarotAssetUrl(url: string): string {
  if (!url) return url
  const cached = resolvedPaths.get(url)
  if (cached) return cached
  const path = readRecord().files[url]
  if (path) {
    resolvedPaths.set(url, path)
    return path
  }
  return url
}

/**
 * 图片加载失败时调用：把该 URL 从映射与会话记忆里剔除，下次进入会重新下载。
 * 这是「映射还在但文件确实失效」的唯一兜底路径，替代进入时的逐条磁盘校验。
 */
export function invalidateTarotAsset(url: string): void {
  if (!url) return
  resolvedPaths.delete(url)
  const record = readRecord()
  if (!record.files[url]) return
  const path = record.files[url]
  delete record.files[url]
  writeRecord(record)
  removeFile(path)
}

/**
 * 进入流程时清掉会话记忆（新一次进入应重新按 storage 映射解析）。
 * 不做逐条磁盘探测：accessSync 在这个环境是跨进程同步调用，24 张会拖出数秒等待，
 * 而映射与落盘文件同生命周期，失效场景由 invalidateTarotAsset（Image onError）兜底。
 */
export function revalidateTarotAssetCache(): void {
  resolvedPaths.clear()
}

/** 资产版本根变化时清空旧缓存（含已落盘文件），返回是否发生了重置。 */
export function resetTarotAssetCacheIfBaseChanged(base: string): boolean {
  const record = readRecord()
  if (record.base === base) return false
  for (const path of Object.values(record.files)) removeFile(path)
  writeRecord({ base, files: {} })
  // 旧版的本地路径已删，清掉会话记忆避免继续指向失效文件
  resolvedPaths.clear()
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
          // 刚落盘即视为可用，登记会话记忆免掉下一次磁盘校验
          resolvedPaths.set(url, savedPath)
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
  // 置空内存档与会话记忆，让下次读取重新走 storage（换环境 / 测试重置时避免读到旧档）
  memoryRecord = null
  resolvedPaths.clear()
  // 同步丢弃缓存的 fs 实例：测试会在用例间替换 mock wx，必须重新获取
  fsManager = null
}
