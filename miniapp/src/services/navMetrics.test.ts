import { afterEach, describe, expect, it } from 'vitest'
import {
  BACK_BUTTON_SIZE_PX,
  FALLBACK_MENU_HEIGHT_PX,
  FALLBACK_TOP_INSET_PX,
  resolveFixedBackTopPx,
  resolveTopInsetPx,
} from './navMetrics'
import { getWxGlobal } from './wxGlobal'

describe('navMetrics resolveTopInsetPx', () => {
  it('prefers the menu button bottom edge plus breathing room', () => {
    expect(resolveTopInsetPx({ bottom: 76 }, 44)).toBe(84)
  })

  it('falls back to statusBarHeight + 48 without a menu rect', () => {
    expect(resolveTopInsetPx(undefined, 44)).toBe(92)
    expect(resolveTopInsetPx({ bottom: 0 }, 20)).toBe(68)
  })

  it('returns the conservative fallback with no metrics at all', () => {
    expect(resolveTopInsetPx(undefined, undefined)).toBe(FALLBACK_TOP_INSET_PX)
  })
})

describe('navMetrics resolveFixedBackTopPx', () => {
  it('aligns the back button vertical center with the capsule center (three-dot icon)', () => {
    // 胶囊底 80、高 32 → 胶囊中心 64；钮高 44 → 钮顶 = 64 - 22 = 42，钮心 = 42 + 22 = 64
    const top = resolveFixedBackTopPx({ bottom: 80, height: 32 }, 47)
    expect(top).toBe(42)
    expect(top + BACK_BUTTON_SIZE_PX / 2).toBe(80 - 32 / 2)
  })

  it('sits lower than the old bottom-aligned placement', () => {
    expect(resolveFixedBackTopPx({ bottom: 80, height: 32 }, 47)).toBeGreaterThan(80 - BACK_BUTTON_SIZE_PX)
  })

  it('uses the default capsule height when the rect omits height', () => {
    expect(resolveFixedBackTopPx({ bottom: 80 }, 47)).toBe(
      80 - FALLBACK_MENU_HEIGHT_PX / 2 - BACK_BUTTON_SIZE_PX / 2,
    )
  })

  it('never yields a negative top when the capsule sits high', () => {
    expect(resolveFixedBackTopPx({ bottom: 20 }, 20)).toBe(0)
  })

  it('falls back below the status bar without a capsule rect', () => {
    expect(resolveFixedBackTopPx(undefined, 47)).toBe(55)
  })

  it('uses a conservative fallback with no metrics at all', () => {
    expect(resolveFixedBackTopPx(undefined, undefined)).toBe(FALLBACK_TOP_INSET_PX - BACK_BUTTON_SIZE_PX)
  })
})

describe('getTopInsetPx wx probing', () => {
  afterEach(() => {
    delete (globalThis as { wx?: unknown }).wx
  })

  it('uses getMenuButtonBoundingClientRect when available', () => {
    ;(globalThis as { wx?: unknown }).wx = {
      getWindowInfo: () => ({ statusBarHeight: 47 }),
      getMenuButtonBoundingClientRect: () => ({ bottom: 80 }),
    }
    try {
      expect(getWxGlobal()?.getMenuButtonBoundingClientRect?.()).toEqual({ bottom: 80 })
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })
})
