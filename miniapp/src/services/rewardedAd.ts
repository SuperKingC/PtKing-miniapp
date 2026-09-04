/**
 * 激励视频广告（报告解锁变现）。
 * 广告位 ID 由构建注入 TARO_AD_UNIT_ID（微信公众平台-流量主-广告位管理创建）；
 * 未配置（本地开发 / 未开通流量主）时 showRewardedAd 直接落定为 'unavailable'。
 * 结果三态：completed 看完完整视频 / aborted 中途关闭 / unavailable 无广告位或 SDK 异常。
 * 降级铁律：SDK 任何异常都返回 'unavailable'，调用方据此直接解锁报告——
 * 广告故障绝不阻断「看报告」主链路（宁可少一单广告，不丢一个用户）。
 */
import { getWxGlobal } from './wxGlobal'

export type RewardedAdOutcome = 'completed' | 'aborted' | 'unavailable'

interface RewardedVideoAdLike {
  load?: () => Promise<void>
  show?: () => Promise<void>
  onClose?: (callback: (res: { isEnded?: boolean }) => void) => void
  onError?: (callback: (error: unknown) => void) => void
}

/** 惰性读取构建常量（vitest 里用 globalThis 注入即可测「已配置」分支） */
function adUnitId(): string {
  return typeof TARO_AD_UNIT_ID === 'string' ? TARO_AD_UNIT_ID : ''
}

/** 广告位是否已配置：未配置（本地开发/未开通流量主）时答题页不落锁，报告无解锁门 */
export function isRewardedAdConfigured(): boolean {
  return adUnitId() !== ''
}

/** 纯函数核心（可单测）：把（广告位配置、关闭回调、是否发生过 SDK 错误）规整为三态结果 */
export function resolveAdOutcome(
  unitId: string,
  isEnded: boolean | undefined,
  errored: boolean,
): RewardedAdOutcome {
  if (!unitId || errored) return 'unavailable'
  return isEnded ? 'completed' : 'aborted'
}

function createAd(unitId: string): RewardedVideoAdLike | null {
  const wxLike = getWxGlobal() as {
    createRewardedVideoAd?: (options: { adUnitId: string }) => RewardedVideoAdLike
  }
  try {
    return wxLike?.createRewardedVideoAd?.({ adUnitId: unitId }) ?? null
  } catch {
    return null
  }
}

let cachedAd: RewardedVideoAdLike | null = null
let inflight: Promise<RewardedAdOutcome> | null = null

/** 拉起一次激励视频：Promise 在用户关闭广告时落定（isEnded 才算看完）；并发调用复用同一次 */
export function showRewardedAd(): Promise<RewardedAdOutcome> {
  if (inflight) return inflight
  inflight = runShow().then((outcome) => {
    inflight = null
    return outcome
  })
  return inflight
}

function runShow(): Promise<RewardedAdOutcome> {
  return new Promise((resolve) => {
    const unitId = adUnitId()
    if (!unitId) {
      resolve('unavailable')
      return
    }
    if (!cachedAd) cachedAd = createAd(unitId)
    const ad = cachedAd
    if (!ad) {
      resolve('unavailable')
      return
    }

    let errored = false
    let settled = false
    const settle = (outcome: RewardedAdOutcome) => {
      if (settled) return
      settled = true
      clearTimeout(watchdog)
      resolve(outcome)
    }
    // 兜底看门狗：onClose 万一不回调（极端机型/SDK 缺陷）也不让解锁流程永久挂起
    const watchdog = setTimeout(() => settle('aborted'), 90_000)

    ad.onError?.(() => {
      errored = true
    })
    ad.onClose?.((res) => {
      settle(resolveAdOutcome(unitId, res?.isEnded, errored))
      // 关闭后预加载下一次，减少下次「打开却没广告」
      try {
        ad.load?.().catch(() => {
          // 预加载失败静默，下次 show 再走重试
        })
      } catch {
        // 忽略
      }
    })

    const showOnce = () => {
      const showing = ad.show?.()
      if (!showing) {
        errored = true
        settle('unavailable')
        return
      }
      showing.catch(() => {
        // 首次 show 失败多为未拉取到广告：load 后重试一次，仍失败按 SDK 异常降级
        Promise.resolve(ad.load?.())
          .then(() => ad.show?.())
          .then(() => {
            // 重试成功，等待 onClose 落定
          })
          .catch(() => {
            errored = true
            settle('unavailable')
          })
      })
    }

    try {
      showOnce()
    } catch {
      errored = true
      settle('unavailable')
    }
  })
}
