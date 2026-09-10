import { afterEach, describe, expect, it } from 'vitest'
import {
  THEME_NAV_BG,
  THEME_NAV_FRONT,
  THEME_PREFERENCE_ORDER,
  THEME_WINDOW_BG,
  applyThemeChrome,
  getThemePreference,
  resetThemeChromeForTests,
  resolveTheme,
  setThemePreference,
} from './theme'

function makeStorageMock() {
  const memory = new Map<string, unknown>()
  return {
    memory,
    wx: {
      getStorageSync: (key: string) => memory.get(key) ?? '',
      setStorageSync: (key: string, value: unknown) => void memory.set(key, value),
      removeStorageSync: (key: string) => void memory.delete(key),
    },
  }
}

describe('resolveTheme (pure)', () => {
  it('auto follows the system theme; explicit choices always win', () => {
    expect(resolveTheme('auto', 'dark')).toBe('dark')
    expect(resolveTheme('auto', 'light')).toBe('light')
    expect(resolveTheme('auto', undefined)).toBe('light')
    expect(resolveTheme('light', 'dark')).toBe('light')
    expect(resolveTheme('dark', 'light')).toBe('dark')
  })

  it('exposes only light/dark for the me-page switch', () => {
    expect(THEME_PREFERENCE_ORDER).toEqual(['light', 'dark'])
  })
})

describe('preference storage round-trip', () => {
  it('defaults to light and round-trips explicit choices', () => {
    const { wx } = makeStorageMock()
    ;(globalThis as { wx?: unknown }).wx = wx
    try {
      expect(getThemePreference()).toBe('light')
      setThemePreference('dark')
      expect(getThemePreference()).toBe('dark')
      setThemePreference('light')
      expect(getThemePreference()).toBe('light')
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })

  it('maps legacy auto and corrupted values to light', () => {
    const { wx } = makeStorageMock()
    ;(globalThis as { wx?: unknown }).wx = wx
    try {
      wx.getStorageSync = () => 'auto'
      expect(getThemePreference()).toBe('light')
      wx.getStorageSync = () => 'banana'
      expect(getThemePreference()).toBe('light')
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })
})

describe('applyThemeChrome', () => {
  afterEach(() => {
    resetThemeChromeForTests()
  })

  it('sets navigation bar and window colors per resolved theme', () => {
    const calls: Record<string, unknown>[] = []
    ;(globalThis as { wx?: unknown }).wx = {
      setNavigationBarColor: (o: Record<string, unknown>) => void calls.push(o),
      setBackgroundColor: (o: Record<string, unknown>) => void calls.push(o),
    }
    try {
      applyThemeChrome('dark')
      expect(calls[0]).toMatchObject({
        frontColor: THEME_NAV_FRONT.dark,
        backgroundColor: THEME_NAV_BG.dark,
      })
      expect(calls[1]).toMatchObject({ backgroundColor: THEME_WINDOW_BG.dark })
      expect(THEME_NAV_BG.dark).toBe(THEME_WINDOW_BG.dark)
      calls.length = 0
      applyThemeChrome('light')
      expect(calls[0]).toMatchObject({
        frontColor: THEME_NAV_FRONT.light,
        backgroundColor: THEME_NAV_BG.light,
      })
      expect(calls[1]).toMatchObject({ backgroundColor: THEME_WINDOW_BG.light })
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })

  it('stays silent without wx', () => {
    expect(() => applyThemeChrome('dark')).not.toThrow()
  })

  it('skips repeating the same theme so tab switches do not flash chrome', () => {
    const calls: Record<string, unknown>[] = []
    ;(globalThis as { wx?: unknown }).wx = {
      setNavigationBarColor: (o: Record<string, unknown>) => void calls.push(o),
      setBackgroundColor: (o: Record<string, unknown>) => void calls.push(o),
    }
    try {
      applyThemeChrome('light')
      applyThemeChrome('light')
      expect(calls).toHaveLength(2)
      applyThemeChrome('light', true)
      expect(calls).toHaveLength(4)
      applyThemeChrome('dark')
      expect(calls).toHaveLength(6)
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })
})