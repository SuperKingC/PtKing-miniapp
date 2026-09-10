import { afterEach, describe, expect, it } from 'vitest'
import { FALLBACK_TOP_INSET_PX, resolveTopInsetPx } from './navMetrics'
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
