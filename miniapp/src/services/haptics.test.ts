import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  impactFeedback,
  isHapticsEnabled,
  longFeedback,
  setHapticsEnabled,
  startPulseHaptics,
  stopPulseHaptics,
  tapFeedback,
} from './haptics'

afterEach(() => {
  stopPulseHaptics()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('震动偏好', () => {
  it('默认轻震且关闭后不震动', () => {
    let stored: unknown = ''
    const vibrateShort = vi.fn()
    vi.stubGlobal('wx', { getStorageSync: () => stored, setStorageSync: (_: string, value: unknown) => { stored = value }, vibrateShort })
    expect(isHapticsEnabled()).toBe(true)
    tapFeedback()
    expect(vibrateShort).toHaveBeenCalledWith({ type: 'light' })
    expect(setHapticsEnabled(false)).toBe(true)
    tapFeedback()
    expect(vibrateShort).toHaveBeenCalledTimes(1)
    expect(setHapticsEnabled(true)).toBe(true)
  })
  it('失败不能显示保存成功；没有API不抛异常', () => {
    vi.stubGlobal('wx', undefined)
    expect(setHapticsEnabled(false)).toBe(false)
    expect(() => tapFeedback()).not.toThrow()
    expect(() => impactFeedback('heavy')).not.toThrow()
    expect(() => longFeedback()).not.toThrow()
    expect(() => startPulseHaptics()).not.toThrow()
    vi.stubGlobal('wx', { getStorageSync: () => { throw Error('storage') }, setStorageSync: () => { throw Error('storage') }, vibrateShort: () => { throw Error('unsupported') }, vibrateLong: () => { throw Error('unsupported') } })
    expect(isHapticsEnabled()).toBe(true)
    expect(setHapticsEnabled(false)).toBe(false)
    expect(() => tapFeedback()).not.toThrow()
    expect(() => longFeedback()).not.toThrow()
    expect(() => startPulseHaptics()).not.toThrow()
  })
  it('可按强度短震，长震走 vibrateLong', () => {
    const vibrateShort = vi.fn()
    const vibrateLong = vi.fn()
    vi.stubGlobal('wx', { getStorageSync: () => true, vibrateShort, vibrateLong })
    impactFeedback('medium')
    impactFeedback('heavy')
    longFeedback()
    expect(vibrateShort).toHaveBeenNthCalledWith(1, { type: 'medium' })
    expect(vibrateShort).toHaveBeenNthCalledWith(2, { type: 'heavy' })
    expect(vibrateLong).toHaveBeenCalledTimes(1)
  })
  it('洗牌脉冲会重复震动，停止后不再触发', () => {
    vi.useFakeTimers()
    const vibrateShort = vi.fn()
    vi.stubGlobal('wx', { getStorageSync: () => true, vibrateShort })
    startPulseHaptics(200)
    expect(vibrateShort).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(400)
    expect(vibrateShort).toHaveBeenCalledTimes(3)
    stopPulseHaptics()
    vi.advanceTimersByTime(400)
    expect(vibrateShort).toHaveBeenCalledTimes(3)
  })
  it('关闭偏好后脉冲不会启动', () => {
    vi.useFakeTimers()
    const vibrateShort = vi.fn()
    vi.stubGlobal('wx', { getStorageSync: () => false, vibrateShort })
    startPulseHaptics(200)
    vi.advanceTimersByTime(400)
    expect(vibrateShort).not.toHaveBeenCalled()
  })
})
