import { describe, expect, it } from 'vitest'
import { getTarotStageFit, ritualStackRpx, rpxToPx } from './tarotStageFit'

describe('getTarotStageFit', () => {
  it('keeps phone clay shuffle at scale 1', () => {
    const fit = getTarotStageFit({
      stage: 'shuffle',
      skin: 'clay',
      cardCount: 1,
      windowWidth: 390,
      windowHeight: 844,
      safeAreaBottom: 34,
      topInsetPx: 88,
    })
    expect(fit.stackRpx).toBe(410)
    expect(fit.scale).toBe(1)
  })

  it('shrinks iPad-wide clay shuffle so the next button stays on screen', () => {
    const fit = getTarotStageFit({
      stage: 'shuffle',
      skin: 'clay',
      cardCount: 1,
      windowWidth: 1024,
      windowHeight: 1366,
      safeAreaBottom: 20,
      topInsetPx: 88,
    })
    expect(fit.stackRpx).toBe(410)
    expect(fit.scale).toBeLessThan(1)
    expect(fit.scale).toBeGreaterThanOrEqual(0.42)
    const stackPx = rpxToPx(fit.stackRpx, 1024) * fit.scale
    expect(stackPx).toBeLessThan(560)
  })

  it('shrinks five-card fan more than a single shuffle on the same iPad', () => {
    const shuffle = getTarotStageFit({
      stage: 'shuffle',
      skin: 'clay',
      cardCount: 5,
      windowWidth: 1024,
      windowHeight: 1366,
      safeAreaBottom: 20,
      topInsetPx: 88,
    })
    const fan = getTarotStageFit({
      stage: 'fan',
      skin: 'clay',
      cardCount: 5,
      windowWidth: 1024,
      windowHeight: 1366,
      safeAreaBottom: 20,
      topInsetPx: 88,
    })
    expect(ritualStackRpx({
      stage: 'fan',
      skin: 'clay',
      cardCount: 5,
      windowHeight: 1366,
    })).toBeGreaterThan(410)
    expect(fan.scale).toBeLessThanOrEqual(shuffle.scale)
  })

  it('shrinks classic five-card fan on a phone so the next button stays on screen', () => {
    // 星夜五牌阵牌组 888rpx（两行已选槽 504 + 牌扇 360 + gap），手机屏装不下：
    // scale 必须 <1 把牌组收进一屏，否则底部「翻开所选牌」被 flex 压没（2026-09-15 用户报）。
    const fit = getTarotStageFit({
      stage: 'fan',
      skin: 'classic',
      cardCount: 5,
      windowWidth: 390,
      windowHeight: 844,
      safeAreaBottom: 34,
      topInsetPx: 47,
    })
    expect(fit.scale).toBeLessThan(1)
    expect(fit.scale).toBeGreaterThanOrEqual(0.42)
  })

  it('keeps classic single-card fan at scale 1 on the same phone', () => {
    // 单张牌组矮一截（660rpx），修正 chrome 后仍应满尺寸，不能矫枉过正一起缩。
    const fit = getTarotStageFit({
      stage: 'fan',
      skin: 'classic',
      cardCount: 1,
      windowWidth: 390,
      windowHeight: 844,
      safeAreaBottom: 34,
      topInsetPx: 47,
    })
    expect(fit.scale).toBe(1)
  })

  it('does not scale question or reading stages', () => {
    expect(getTarotStageFit({
      stage: 'question',
      skin: 'clay',
      cardCount: 1,
      windowWidth: 1024,
      windowHeight: 1366,
      safeAreaBottom: 0,
      topInsetPx: 88,
    }).scale).toBe(1)
  })
})
