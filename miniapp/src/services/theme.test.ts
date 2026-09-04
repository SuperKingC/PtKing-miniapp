import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  THEME_PREFERENCE_ORDER,
  applyThemeChrome,
  getThemePreference,
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

  it('exposes the preference order shown on the me page', () => {
    expect(THEME_PREFERENCE_ORDER).toEqual(['auto', 'light', 'dark'])
  })
})

describe('preference storage round-trip', () => {
  it('defaults to auto and round-trips explicit choices', () => {
    const { wx } = makeStorageMock()
    ;(globalThis as { wx?: unknown }).wx = wx
    try {
      expect(getThemePreference()).toBe('auto')
      setThemePreference('dark')
      expect(getThemePreference()).toBe('dark')
      setThemePreference('light')
      expect(getThemePreference()).toBe('light')
      // 回到跟随系统 = 清掉存储值
      setThemePreference('auto')
      expect(getThemePreference()).toBe('auto')
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })

  it('falls back to auto on corrupted storage values', () => {
    const { wx } = makeStorageMock()
    ;(globalThis as { wx?: unknown }).wx = wx
    wx.getStorageSync = () => 'banana'
    try {
      expect(getThemePreference()).toBe('auto')
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })
})

describe('applyThemeChrome', () => {
  it('sets navigation bar and window colors per resolved theme', () => {
    const calls: Record<string, unknown>[] = []
    ;(globalThis as { wx?: unknown }).wx = {
      setNavigationBarColor: (o: Record<string, unknown>) => void calls.push(o),
      setBackgroundColor: (o: Record<string, unknown>) => void calls.push(o),
    }
    try {
      applyThemeChrome('dark')
      expect(calls[0]).toMatchObject({ frontColor: '#ffffff', backgroundColor: '#211b16' })
      expect(calls[1]).toMatchObject({ backgroundColor: '#191411' })
      calls.length = 0
      applyThemeChrome('light')
      expect(calls[0]).toMatchObject({ frontColor: '#000000', backgroundColor: '#f7f4ee' })
      expect(calls[1]).toMatchObject({ backgroundColor: '#f7f4ee' })
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })

  it('stays silent without wx', () => {
    expect(() => applyThemeChrome('dark')).not.toThrow()
  })
})