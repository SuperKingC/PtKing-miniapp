import { resolveAssetBaseUrl } from '../../services/assetBaseUrl'
import { getWxGlobal } from '../../services/wxGlobal'

const artworkFiles = [
  'the-fool.jpg',
  'the-magician.jpg',
  'high-priestess.jpg',
  'the-empress.jpg',
  'the-emperor.jpg',
  'the-hierophant.jpg',
  'the-lovers.jpg',
  'the-chariot.jpg',
  'strength.jpg',
  'the-hermit.jpg',
  'wheel-of-fortune.jpg',
  'justice.jpg',
  'the-hanged-man.jpg',
  'death.jpg',
  'temperance.jpg',
  'the-devil.jpg',
  'the-tower.jpg',
  'the-star.jpg',
  'the-moon.jpg',
  'the-sun.jpg',
  'judgement.jpg',
  'the-world.jpg',
]

// 塔罗资源统一挂在资产版本根的 /tarot 子路径下；路径由塔罗功能自持，与其它功能解耦
export function getTarotSanctuaryBackground(): string {
  return `${resolveAssetBaseUrl()}/tarot/ui/sanctuary-background.jpg`
}

export function getTarotCardBack(): string {
  return `${resolveAssetBaseUrl()}/tarot/ui/card-back.jpg`
}

export function getTarotArtworkUrl(cardId: number): string {
  return `${resolveAssetBaseUrl()}/tarot/cards/${artworkFiles[cardId] ?? artworkFiles[0]}`
}

export function getTarotResourceUrls(): string[] {
  return [
    getTarotSanctuaryBackground(),
    getTarotCardBack(),
    ...Array.from({ length: 22 }, (_, i) => getTarotArtworkUrl(i)),
  ]
}

export interface TarotPreloadResult {
  failedUrls: string[]
  total: number
}

/** 整批预加载上限：弱网挂起时让用户尽快看到失败重试，而不是一直转圈。 */
export const TAROT_PRELOAD_TIMEOUT_MS = 40000

export function isUsableTarotAssetUrl(url: string): boolean {
  if (!url || url.includes('placeholder.cos.')) return false
  if (/^https:\/\//.test(url)) return true
  return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)
}

/** 真机 downloadFile 偶发只给 tempFilePath、不回 200；4xx/5xx 仍算失败。 */
export function isTarotDownloadSuccess(result: { statusCode?: number; tempFilePath?: string }): boolean {
  const code = result.statusCode
  if (code === 200) return true
  if (typeof code === 'number' && code >= 400) return false
  return Boolean(result.tempFilePath)
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('tarot_preload_timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function downloadTarotFile(url: string): Promise<{ statusCode?: number; tempFilePath?: string }> {
  const wxApi = getWxGlobal()
  if (!wxApi?.downloadFile) return Promise.reject(new Error('downloadFile_unavailable'))
  return new Promise((resolve, reject) => {
    wxApi.downloadFile?.({
      url,
      success: resolve,
      fail: reject,
    })
  })
}

/**
 * 下载全部塔罗资源，确认每张图片均可访问后才允许进入流程。
 * 走 wx.downloadFile 回调式 API（真机 Taro 动态 import 不保证 Promise 化）。
 * 使用并发 worker 模式，最多同时 4 个下载。
 */
export async function preloadTarotResources(
  onProgress: (progress: number) => void = () => undefined,
): Promise<TarotPreloadResult> {
  const urls = getTarotResourceUrls()
  if (urls.length === 0) {
    onProgress(1)
    return { failedUrls: [], total: 0 }
  }

  const unusable = urls.filter((url) => !isUsableTarotAssetUrl(url))
  if (unusable.length > 0) {
    onProgress(1)
    return { failedUrls: unusable, total: urls.length }
  }

  let nextIndex = 0
  let completed = 0
  const finished = new Set<string>()
  const failedUrls: string[] = []

  async function downloadOne(url: string): Promise<void> {
    try {
      const result = await downloadTarotFile(url)
      if (!isTarotDownloadSuccess(result)) failedUrls.push(url)
    } catch {
      failedUrls.push(url)
    } finally {
      finished.add(url)
    }
  }

  async function worker() {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex]
      nextIndex++
      await downloadOne(url)
      completed++
      onProgress(completed / urls.length)
    }
  }

  const concurrency = Math.min(4, urls.length)
  try {
    await withTimeout(Promise.all(Array.from({ length: concurrency }, () => worker())), TAROT_PRELOAD_TIMEOUT_MS)
  } catch {
    for (const url of urls) {
      if (!finished.has(url) && !failedUrls.includes(url)) failedUrls.push(url)
    }
  }
  return { failedUrls, total: urls.length }
}
