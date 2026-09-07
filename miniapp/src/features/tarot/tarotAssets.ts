import { resolveAssetBaseUrl } from '../../services/assetBaseUrl'

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
export const TAROT_PRELOAD_TIMEOUT_MS = 20000

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

/**
 * 下载全部塔罗资源，确认每张图片均可访问后才允许进入流程。
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

  // 动态导入避免在非小程序环境报错
  const Taro = await import('@tarojs/taro')
  let nextIndex = 0
  let completed = 0
  const finished = new Set<string>()
  const failedUrls: string[] = []

  async function downloadOne(url: string): Promise<void> {
    try {
      const result = await Taro.downloadFile({ url })
      if (result.statusCode !== 200) failedUrls.push(url)
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
