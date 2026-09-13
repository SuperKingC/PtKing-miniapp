import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/assetBaseUrl', () => ({
  resolveAssetBaseUrl: () => 'https://cos.example.com/ptking/v1',
}))

import {
  areTarotAssetsCached,
  getTarotCardBack,
  getTarotResourceUrls,
  getTarotSanctuaryBackground,
  getTarotArtworkUrl,
  isTarotDownloadSuccess,
  isUsableTarotAssetUrl,
  preloadTarotResources,
  resolveTarotAssetUrl,
  TAROT_PRELOAD_TIMEOUT_MS,
} from './tarotAssets'
import { clearTarotAssetCache, saveTarotAssetFromTemp } from './tarotAssetCache'

const downloadFile = vi.fn()

describe('miniapp tarot assets', () => {
  beforeEach(() => {
    downloadFile.mockReset()
    clearTarotAssetCache()
    const storage = new Map<string, unknown>()
    const files = new Set<string>()
    ;(globalThis as { wx?: unknown }).wx = {
      downloadFile: (options: { url: string; success?: (result: unknown) => void; fail?: (error?: unknown) => void }) => {
        Promise.resolve(downloadFile(options.url)).then(
          (result) => options.success?.(result),
          (error) => options.fail?.(error),
        )
      },
      getSystemInfoSync: () => ({ platform: 'devtools' }),
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => { storage.set(key, value) },
      getFileSystemManager: () => ({
        saveFile: ({ tempFilePath, success }: { tempFilePath: string; success?: (result: { savedFilePath?: string }) => void }) => {
          const savedFilePath = `wxfile://${tempFilePath}`
          files.add(savedFilePath)
          success?.({ savedFilePath })
        },
        accessSync: (path: string) => {
          if (!files.has(path)) throw new Error('ENOENT')
          return undefined
        },
        unlinkSync: (path: string) => { files.delete(path) },
      }),
    }
  })

  afterEach(() => {
    delete (globalThis as { wx?: unknown }).wx
  })

  it('builds tarot URLs under the /tarot path of the resolved asset base', () => {
    expect(getTarotCardBack('classic')).toContain('/tarot/ui/card-back.jpg')
    expect(getTarotSanctuaryBackground('classic')).toContain('/tarot/ui/sanctuary-background.jpg')
    expect(getTarotArtworkUrl(0, 'classic')).toContain('/tarot/cards/the-fool.jpg')
    expect(getTarotArtworkUrl(21, 'classic')).toContain('/tarot/cards/the-world.jpg')
  })

  it('suffices clay skin asset files with -clay', () => {
    expect(getTarotCardBack('clay')).toContain('/tarot/ui/card-back-clay-v2.jpg')
    expect(getTarotSanctuaryBackground('clay')).toContain('/tarot/ui/sanctuary-background-clay-v2.jpg')
    expect(getTarotArtworkUrl(0, 'clay')).toContain('/tarot/cards/the-fool-clay.jpg')
    expect(getTarotArtworkUrl(21, 'clay')).toContain('/tarot/cards/the-world-clay.jpg')
  })

  it('falls back to the first artwork for unknown card ids', () => {
    expect(getTarotArtworkUrl(99, 'classic')).toContain('/tarot/cards/the-fool.jpg')
    expect(getTarotArtworkUrl(99, 'clay')).toContain('/tarot/cards/the-fool-clay.jpg')
  })

  it('lists all 24 tarot resource URLs for preloading per skin', () => {
    for (const skin of ['classic', 'clay'] as const) {
      const urls = getTarotResourceUrls(skin)
      expect(urls).toHaveLength(24)
      expect(urls[0]).toContain(`sanctuary-background${skin === 'clay' ? '-clay-v2' : ''}.jpg`)
      expect(urls[1]).toContain(`card-back${skin === 'clay' ? '-clay-v2' : ''}.jpg`)
      expect(urls[2]).toContain(`the-fool${skin === 'clay' ? '-clay' : ''}.jpg`)
      expect(urls[23]).toContain(`the-world${skin === 'clay' ? '-clay' : ''}.jpg`)
    }
  })

  it('rejects placeholder and non-https asset urls', () => {
    expect(isUsableTarotAssetUrl('https://cos.example.com/tarot/ui/card-back.jpg')).toBe(true)
    expect(isUsableTarotAssetUrl('http://127.0.0.1:8787/tarot/ui/card-back.jpg')).toBe(true)
    expect(isUsableTarotAssetUrl('https://placeholder.cos.ap-guangzhou.myqcloud.com/ptking-web/local-dev/tarot/ui/card-back.jpg')).toBe(false)
    expect(isUsableTarotAssetUrl('http://evil.example/tarot/ui/card-back.jpg')).toBe(false)
    expect(isUsableTarotAssetUrl('')).toBe(false)
  })

  it('accepts 200 and temp-path downloads, rejects http errors', () => {
    expect(isTarotDownloadSuccess({ statusCode: 200, tempFilePath: '/tmp/a' })).toBe(true)
    expect(isTarotDownloadSuccess({ tempFilePath: '/tmp/a' })).toBe(true)
    expect(isTarotDownloadSuccess({ statusCode: 0, tempFilePath: '/tmp/a' })).toBe(true)
    expect(isTarotDownloadSuccess({ statusCode: 404 })).toBe(false)
    expect(isTarotDownloadSuccess({ statusCode: 403, tempFilePath: '/tmp/a' })).toBe(false)
    expect(isTarotDownloadSuccess({})).toBe(false)
  })

  it('reports every non-200 download as a failed resource', async () => {
    downloadFile.mockResolvedValue({ statusCode: 404 })

    const result = await preloadTarotResources()

    expect(result.total).toBe(24)
    expect(result.failedUrls).toHaveLength(24)
  })

  it('accepts downloads that only return a temp file path', async () => {
    downloadFile.mockResolvedValue({ tempFilePath: '/tmp/tarot.jpg' })

    const result = await preloadTarotResources()

    expect(result.failedUrls).toHaveLength(0)
    expect(downloadFile).toHaveBeenCalled()
  })

  it('persists downloaded resources to the local cache and resolves them offline', async () => {
    downloadFile.mockImplementation((url: string) => Promise.resolve({ statusCode: 200, tempFilePath: `/tmp/${encodeURIComponent(url)}.jpg` }))

    const result = await preloadTarotResources()
    expect(result.failedUrls).toHaveLength(0)

    const url = getTarotCardBack('clay')
    expect(resolveTarotAssetUrl(url)).toContain('wxfile://')
    expect(resolveTarotAssetUrl(url)).not.toBe(url)
  })

  it('skips network downloads for resources already cached on a second entry', async () => {
    downloadFile.mockImplementation((url: string) => Promise.resolve({ statusCode: 200, tempFilePath: `/tmp/${encodeURIComponent(url)}.jpg` }))

    // 首次进入：24 张全部下载并落盘
    await preloadTarotResources()
    expect(downloadFile).toHaveBeenCalledTimes(24)

    // 二次进入：全部命中本地缓存，不再发起任何下载
    downloadFile.mockClear()
    const result = await preloadTarotResources()

    expect(result.failedUrls).toHaveLength(0)
    expect(downloadFile).not.toHaveBeenCalled()
    const url = getTarotCardBack('clay')
    expect(resolveTarotAssetUrl(url)).toContain('wxfile://')
  })

  it('reports how many resources actually hit the network', async () => {
    downloadFile.mockImplementation((url: string) => Promise.resolve({ statusCode: 200, tempFilePath: `/tmp/${encodeURIComponent(url)}.jpg` }))

    const first = await preloadTarotResources()
    expect(first.downloaded).toBe(24) // 首次全走网络

    downloadFile.mockClear()
    const second = await preloadTarotResources()
    expect(second.downloaded).toBe(0) // 二次全命中缓存
    expect(downloadFile).not.toHaveBeenCalled()
  })

  it('detects when every asset is already cached (for skipping the loading UI)', async () => {
    expect(areTarotAssetsCached('clay')).toBe(false)

    // 逐张落盘后应为全命中
    const urls = getTarotResourceUrls('clay')
    for (const url of urls) await saveTarotAssetFromTemp(url, `/tmp/${encodeURIComponent(url)}`)

    expect(areTarotAssetsCached('clay')).toBe(true)
    // 另一套皮肤未缓存，仍应为 false
    expect(areTarotAssetsCached('classic')).toBe(false)
  })

  it('treats hung downloads as failed after the preload timeout', async () => {
    vi.useFakeTimers()
    downloadFile.mockReturnValue(new Promise(() => undefined))

    const pending = preloadTarotResources()
    await vi.advanceTimersByTimeAsync(TAROT_PRELOAD_TIMEOUT_MS)
    const result = await pending

    expect(result.failedUrls).toHaveLength(24)
    vi.useRealTimers()
  })
})
