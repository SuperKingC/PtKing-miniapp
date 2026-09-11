import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/assetBaseUrl', () => ({
  resolveAssetBaseUrl: () => 'https://cos.example.com/ptking/v1',
}))

import {
  getTarotCardBack,
  getTarotResourceUrls,
  getTarotSanctuaryBackground,
  getTarotArtworkUrl,
  isTarotDownloadSuccess,
  isUsableTarotAssetUrl,
  preloadTarotResources,
  TAROT_PRELOAD_TIMEOUT_MS,
} from './tarotAssets'

const downloadFile = vi.fn()

describe('miniapp tarot assets', () => {
  beforeEach(() => {
    downloadFile.mockReset()
    ;(globalThis as { wx?: { downloadFile: (options: { url: string; success?: (result: unknown) => void; fail?: (error?: unknown) => void }) => void; getSystemInfoSync: () => { platform: string } } }).wx = {
      downloadFile: (options: { url: string; success?: (result: unknown) => void; fail?: (error?: unknown) => void }) => {
        Promise.resolve(downloadFile(options.url)).then(
          (result) => options.success?.(result),
          (error) => options.fail?.(error),
        )
      },
      getSystemInfoSync: () => ({ platform: 'devtools' }),
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
    expect(getTarotCardBack('clay')).toContain('/tarot/ui/card-back-clay.jpg')
    expect(getTarotSanctuaryBackground('clay')).toContain('/tarot/ui/sanctuary-background-clay.jpg')
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
      expect(urls[0]).toContain(`sanctuary-background${skin === 'clay' ? '-clay' : ''}.jpg`)
      expect(urls[1]).toContain(`card-back${skin === 'clay' ? '-clay' : ''}.jpg`)
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
