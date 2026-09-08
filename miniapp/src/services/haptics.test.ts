import { afterEach, describe, expect, it, vi } from 'vitest'
import { isHapticsEnabled, setHapticsEnabled, tapFeedback } from './haptics'

afterEach(() => { vi.unstubAllGlobals() })
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
    vi.stubGlobal('wx', { getStorageSync: () => { throw Error('storage') }, setStorageSync: () => { throw Error('storage') }, vibrateShort: () => { throw Error('unsupported') } })
    expect(isHapticsEnabled()).toBe(true)
    expect(setHapticsEnabled(false)).toBe(false)
    expect(() => tapFeedback()).not.toThrow()
  })
})
