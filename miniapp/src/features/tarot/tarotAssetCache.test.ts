import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  clearTarotAssetCache,
  invalidateTarotAsset,
  isTarotAssetCached,
  resetTarotAssetCacheIfBaseChanged,
  resolveTarotAssetUrl,
  revalidateTarotAssetCache,
  saveTarotAssetFromTemp,
} from './tarotAssetCache'

const URL_A = 'https://cos.example.com/v1/tarot/cards/the-fool.jpg'
const BASE = 'https://cos.example.com/v1'

function installWx(options: {
  saved?: string | false
  existing?: string[]
  saveFileThrows?: boolean
  garbageStorage?: boolean
  seed?: unknown
} = {}) {
  const storage = new Map<string, unknown>()
  if (options.seed !== undefined) storage.set('ptking_tarot_asset_cache', options.seed)
  const removed: string[] = []
  const existing = new Set(options.existing ?? [])
  // 计数 getFileSystemManager / accessSync：渲染热路径不应重复触发磁盘 IO
  const io = { fsmCalls: 0, accessCalls: 0 }
  const wx = {
    getStorageSync: (key: string) => (options.garbageStorage ? 'not-an-object' : storage.get(key)),
    setStorageSync: (key: string, value: unknown) => { storage.set(key, value) },
    getFileSystemManager: options.garbageStorage ? () => undefined : () => {
      io.fsmCalls++
      return {
        saveFile: ({ tempFilePath, success, fail }: {
          tempFilePath: string
          success?: (result: { savedFilePath?: string }) => void
          fail?: (error?: unknown) => void
        }) => {
          if (options.saveFileThrows) throw new Error('save boom')
          if (options.saved === false) { fail?.(new Error('save failed')); return }
          const savedFilePath = options.saved ?? `wxfile://${tempFilePath}`
          existing.add(savedFilePath)
          success?.({ savedFilePath })
        },
        accessSync: (path: string) => {
          io.accessCalls++
          if (!existing.has(path)) throw new Error('ENOENT')
          return undefined
        },
        unlinkSync: (path: string) => { removed.push(path); existing.delete(path) },
      }
    },
  }
  ;(globalThis as { wx?: unknown }).wx = wx
  return { storage, removed, existing, io }
}

const saveBase = () => resetTarotAssetCacheIfBaseChanged(BASE)

describe('tarot asset cache', () => {
  beforeEach(() => {
    clearTarotAssetCache()
  })

  afterEach(() => {
    delete (globalThis as { wx?: unknown }).wx
  })

  it('persists a downloaded temp file and resolves the URL to the local path', async () => {
    installWx({ existing: ['wxfile:///tmp/a'] })
    saveBase()
    const ok = await saveTarotAssetFromTemp(URL_A, '/tmp/a')

    expect(ok).toBe(true)
    expect(isTarotAssetCached(URL_A)).toBe(true)
    expect(resolveTarotAssetUrl(URL_A)).toBe('wxfile:///tmp/a')
  })

  it('leaves uncached urls pointing at the remote source', () => {
    installWx()
    expect(isTarotAssetCached(URL_A)).toBe(false)
    expect(resolveTarotAssetUrl(URL_A)).toBe(URL_A)
  })

  it('memoizes the resolved path within a session (no repeated disk IO)', async () => {
    const { existing, io } = installWx({ existing: ['wxfile:///tmp/a'] })
    saveBase()
    await saveTarotAssetFromTemp(URL_A, '/tmp/a')

    // 首次解析后即便磁盘文件消失，会话记忆仍返回本地路径（渲染层每帧调用不该触发 IO）
    expect(resolveTarotAssetUrl(URL_A)).toBe('wxfile:///tmp/a')
    existing.clear()
    expect(resolveTarotAssetUrl(URL_A)).toBe('wxfile:///tmp/a')
  })

  it('never touches the filesystem while resolving (regression: entry stalled seconds)', async () => {
    // 复现线上症状：冷启动后 storage 已有 24 条映射，进流程时逐条 accessSync 校验，
    // 在开发者工具里每次同步跨进程调用上百毫秒，24 张拖出数秒等待。
    // 契约：解析与命中判断都只读 storage 映射，零磁盘 IO。
    const urls = Array.from({ length: 24 }, (_, i) => `${BASE}/tarot/cards/card-${i}.jpg`)
    const files: Record<string, string> = {}
    for (let i = 0; i < urls.length; i++) files[urls[i]] = `wxfile:///tmp/card-${i}`
    const { io } = installWx({ seed: { base: BASE, files } })

    io.fsmCalls = 0
    io.accessCalls = 0

    for (let round = 0; round < 10; round++) {
      for (const u of urls) expect(resolveTarotAssetUrl(u)).toContain('wxfile:///tmp/card-')
    }
    for (const u of urls) expect(isTarotAssetCached(u)).toBe(true)

    // 10 轮 × 24 张渲染 + 24 次命中判断，全程零磁盘探测
    expect(io.accessCalls).toBe(0)
    expect(io.fsmCalls).toBe(0)
  })

  it('invalidateTarotAsset drops a bad entry so the next entry re-downloads', async () => {
    // 映射与落盘文件同生命周期；真失效（文件被清）由 Image onError 走这里兜底
    const { existing } = installWx({ existing: ['wxfile:///tmp/a'] })
    saveBase()
    await saveTarotAssetFromTemp(URL_A, '/tmp/a')
    expect(isTarotAssetCached(URL_A)).toBe(true)

    invalidateTarotAsset(URL_A)

    expect(isTarotAssetCached(URL_A)).toBe(false)
    expect(resolveTarotAssetUrl(URL_A)).toBe(URL_A)
  })

  it('clears session memory on revalidate so a new entry re-reads storage', async () => {
    const { existing } = installWx({ existing: ['wxfile:///tmp/a'] })
    saveBase()
    await saveTarotAssetFromTemp(URL_A, '/tmp/a')

    revalidateTarotAssetCache()
    // 重校验后仍能按映射解析（映射未丢），且不触发磁盘探测
    expect(resolveTarotAssetUrl(URL_A)).toBe('wxfile:///tmp/a')
  })

  it('reports failure without caching when saveFile fails or throws', async () => {
    installWx({ saved: false })
    expect(await saveTarotAssetFromTemp(URL_A, '/tmp/a')).toBe(false)
    expect(isTarotAssetCached(URL_A)).toBe(false)

    clearTarotAssetCache()
    installWx({ saveFileThrows: true })
    expect(await saveTarotAssetFromTemp(URL_A, '/tmp/a')).toBe(false)
    expect(isTarotAssetCached(URL_A)).toBe(false)
  })

  it('deletes old files and resets the map when the asset base version changes', async () => {
    const { removed } = installWx({ existing: ['wxfile:///tmp/a'] })
    saveBase()
    await saveTarotAssetFromTemp(URL_A, '/tmp/a')

    const reset = resetTarotAssetCacheIfBaseChanged('https://cos.example.com/v2')

    expect(reset).toBe(true)
    expect(removed).toContain('wxfile:///tmp/a')
    expect(isTarotAssetCached(URL_A)).toBe(false)
  })

  it('keeps the cache when the asset base is unchanged', async () => {
    installWx({ existing: ['wxfile:///tmp/a'] })
    saveBase()
    await saveTarotAssetFromTemp(URL_A, '/tmp/a')

    expect(resetTarotAssetCacheIfBaseChanged(BASE)).toBe(false)
    expect(isTarotAssetCached(URL_A)).toBe(true)
  })

  it('falls back to an empty cache when storage holds garbage', async () => {
    installWx({ garbageStorage: true })

    expect(isTarotAssetCached(URL_A)).toBe(false)
    expect(resolveTarotAssetUrl(URL_A)).toBe(URL_A)
    // 无文件系统时落盘失败但不抛，渲染仍可退回远程
    await expect(saveTarotAssetFromTemp(URL_A, '/tmp/a')).resolves.toBe(false)
  })
})
