import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  clearTarotAssetCache,
  isTarotAssetCached,
  resetTarotAssetCacheIfBaseChanged,
  resolveTarotAssetUrl,
  saveTarotAssetFromTemp,
} from './tarotAssetCache'

const URL_A = 'https://cos.example.com/v1/tarot/cards/the-fool.jpg'
const BASE = 'https://cos.example.com/v1'

function installWx(options: {
  saved?: string | false
  existing?: string[]
  saveFileThrows?: boolean
  garbageStorage?: boolean
} = {}) {
  const storage = new Map<string, unknown>()
  const removed: string[] = []
  const existing = new Set(options.existing ?? [])
  const wx = {
    getStorageSync: (key: string) => (options.garbageStorage ? 'not-an-object' : storage.get(key)),
    setStorageSync: (key: string, value: unknown) => { storage.set(key, value) },
    getFileSystemManager: options.garbageStorage ? () => undefined : () => ({
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
        if (!existing.has(path)) throw new Error('ENOENT')
        return undefined
      },
      unlinkSync: (path: string) => { removed.push(path); existing.delete(path) },
    }),
  }
  ;(globalThis as { wx?: unknown }).wx = wx
  return { storage, removed, existing }
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

  it('treats a saved path that no longer exists on disk as uncached', async () => {
    const { existing } = installWx({ existing: ['wxfile:///tmp/a'] })
    saveBase()
    await saveTarotAssetFromTemp(URL_A, '/tmp/a')
    existing.clear() // 模拟系统回收本地文件

    expect(isTarotAssetCached(URL_A)).toBe(false)
    expect(resolveTarotAssetUrl(URL_A)).toBe(URL_A)
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
