/**
 * 仪式阶段牌组按视口收进一屏：宽屏 rpx 会把牌堆放得过大，定高 spacer 再占一截，
 * 按钮和跳过提示就被顶出屏。这里按窗口算出 scale≤1，CSS 用 --tarot-stage-scale 缩放占位。
 */
import { getWxGlobal } from '../../services/wxGlobal'
import type { TarotSkin } from './tarotSkin'

export type TarotFitStage = 'shuffle' | 'cut' | 'fan' | 'reveal'

export function rpxToPx(rpx: number, windowWidth: number): number {
  if (!(windowWidth > 0)) return 0
  return (rpx * windowWidth) / 750
}

function isShortWindow(windowHeight: number): boolean {
  return windowHeight > 0 && windowHeight <= 720
}

function pickedRowRpx(skin: TarotSkin, cardCount: number, short: boolean): number {
  if (cardCount >= 5) {
    const height = short && skin === 'clay' ? 162 : skin === 'clay' ? 212 : 238
    const gap = skin === 'clay' ? 20 : 28
    return height * 2 + gap
  }
  if (cardCount <= 1) {
    if (skin === 'clay') return short ? 132 : 264
    return 276
  }
  return 220
}

function fanRpx(skin: TarotSkin, short: boolean): number {
  if (skin === 'clay') return short ? 220 : 270
  return 360
}

function revealRpx(skin: TarotSkin, cardCount: number, short: boolean): number {
  if (cardCount >= 5) {
    const row = 240 + 80
    const gap = 28
    const height = row * 2 + gap
    return short && skin === 'clay' ? Math.round(height * 0.84) : height
  }
  return 420
}

export function ritualStackRpx(input: {
  stage: TarotFitStage
  skin: TarotSkin
  cardCount: number
  windowHeight: number
}): number {
  const short = isShortWindow(input.windowHeight)
  const { stage, skin, cardCount } = input
  if (stage === 'shuffle') {
    if (skin === 'clay') return short ? 300 : 410
    return 430
  }
  if (stage === 'cut') {
    if (skin === 'clay') return short ? 300 : 368
    return 392
  }
  if (stage === 'fan') {
    const gap = skin === 'clay' ? 16 : 24
    return pickedRowRpx(skin, cardCount, short) + gap + fanRpx(skin, short)
  }
  return revealRpx(skin, cardCount, short)
}

export function ritualChromePx(input: {
  stage: TarotFitStage
  skin: TarotSkin
  windowWidth: number
  safeAreaBottom: number
  topInsetPx: number
}): number {
  const rpx = (value: number) => rpxToPx(value, input.windowWidth)
  const header = input.topInsetPx + rpx(20) + rpx(58)
  const progress = input.skin === 'clay' ? 0 : rpx(46)
  const padTop = input.skin === 'clay' ? rpx(190) : rpx(60)
  const padBottom = rpx(72) + Math.max(0, input.safeAreaBottom)
  const next = rpx(88)
  const skip = input.stage === 'shuffle' || input.stage === 'cut' ? rpx(56) : 0
  const hint = input.skin === 'clay' ? 0 : rpx(40)
  if (input.skin === 'clay') {
    // clay 实测验收口径（2026-09-13）：气泡 fixed 不占流内高度、下 spacer 隐藏、
    // 上 spacer min 8rpx、阶段 gap 16rpx。这组值别动，动了牌组落位会漂。
    const minSpacer = rpx(8)
    const gap = rpx(16)
    const actionGaps = gap * (skip > 0 ? 2 : 1)
    return header + progress + padTop + padBottom + minSpacer + next + skip + hint + actionGaps + 12
  }
  // classic 标题占流内高（34rpx×1.4）、两根 spacer 都有 min-height（72/48rpx）、
  // 阶段子节点间逐个 24rpx gap（fan 6 子=5 gap／cut 7 子=6 gap／shuffle 8 子=7 gap 另加进度条／
  // reveal 5 子=4 gap）。少算任何一项 available 就偏大、scale 不缩：五牌阵牌组超一屏时
  // 底部按钮会被 flex 压没／overflow 裁掉（2026-09-15 星夜五牌抽牌用户报）。
  const title = rpx(48)
  const minSpacer = rpx(120)
  const gap = rpx(24)
  const gapCount = input.stage === 'shuffle' ? 7 : input.stage === 'cut' ? 6 : input.stage === 'reveal' ? 4 : 5
  const shuffleBar = input.stage === 'shuffle' ? rpx(32) : 0
  return header + progress + padTop + padBottom + minSpacer + title + gap * gapCount + shuffleBar + next + skip + hint + 12
}

export function isTarotFitStage(stage: string): stage is TarotFitStage {
  return stage === 'shuffle' || stage === 'cut' || stage === 'fan' || stage === 'reveal'
}

export function getTarotStageFit(input: {
  stage: string
  skin: TarotSkin
  cardCount: number
  windowWidth: number
  windowHeight: number
  safeAreaBottom: number
  topInsetPx: number
}): { scale: number; stackRpx: number } {
  if (!isTarotFitStage(input.stage)) return { scale: 1, stackRpx: 410 }

  const stackRpx = ritualStackRpx({
    stage: input.stage,
    skin: input.skin,
    cardCount: input.cardCount,
    windowHeight: input.windowHeight,
  })
  const chrome = ritualChromePx({
    stage: input.stage,
    skin: input.skin,
    windowWidth: input.windowWidth,
    safeAreaBottom: input.safeAreaBottom,
    topInsetPx: input.topInsetPx,
  })
  const stackPx = rpxToPx(stackRpx, input.windowWidth)
  const available = input.windowHeight - chrome
  if (!(stackPx > 0) || !(available > 0)) return { scale: 1, stackRpx }

  const scale = Math.min(1, available / stackPx)
  return {
    // 向下取整：保证缩后牌组 ≤ available；四舍五入可能向上留半格残余溢出，
    // 残余溢出又会去裁底部按钮。
    scale: Math.max(0.42, Math.floor(scale * 100) / 100),
    stackRpx,
  }
}

export function readTarotWindowBox(): { width: number; height: number; safeAreaBottom: number } {
  try {
    const wx = getWxGlobal()
    const info = (wx?.getWindowInfo?.() ?? wx?.getSystemInfoSync?.()) as {
      windowWidth?: number
      windowHeight?: number
      safeArea?: { bottom?: number }
    } | undefined
    const width = info?.windowWidth
    const height = info?.windowHeight
    if (typeof width === 'number' && width > 0 && typeof height === 'number' && height > 0) {
      const safeBottom = typeof info.safeArea?.bottom === 'number'
        ? Math.max(0, height - info.safeArea.bottom)
        : 0
      return { width, height, safeAreaBottom: safeBottom }
    }
  } catch {
    // vitest / 无 wx
  }
  return { width: 390, height: 844, safeAreaBottom: 0 }
}
