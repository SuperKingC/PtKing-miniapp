import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMotionPreference, setMotionPreference, subscribeMotionPreference } from './motionPreference'

afterEach(() => { vi.unstubAllGlobals() })

describe('motion preference', () => {
  it('defaults to system for missing, invalid or unreadable storage', () => {
    for (const value of ['', null, 'unknown', false]) {
      vi.stubGlobal('wx', { getStorageSync: () => value })
      expect(getMotionPreference()).toBe('system')
    }
    vi.stubGlobal('wx', { getStorageSync: () => { throw Error('storage') } })
    expect(getMotionPreference()).toBe('system')
  })

  it('persists all modes and notifies mounted pages only after success', () => {
    let stored: unknown = ''
    vi.stubGlobal('wx', {
      getStorageSync: () => stored,
      setStorageSync: (_key: string, value: unknown) => { stored = value },
    })
    const listener = vi.fn()
    const unsubscribe = subscribeMotionPreference(listener)
    for (const pref of ['standard', 'reduced', 'system'] as const) {
      expect(setMotionPreference(pref)).toBe(true)
      expect(getMotionPreference()).toBe(pref)
    }
    expect(listener).toHaveBeenCalledTimes(3)
    unsubscribe()
    setMotionPreference('reduced')
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('does not publish a preference when persistence fails', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeMotionPreference(listener)
    vi.stubGlobal('wx', undefined)
    expect(setMotionPreference('reduced')).toBe(false)
    vi.stubGlobal('wx', { setStorageSync: () => { throw Error('full') } })
    expect(setMotionPreference('standard')).toBe(false)
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('wires CSS-only reduction without changing stage timers', () => {
    const read = (file: string) => fs.readFileSync(path.resolve(__dirname, file), 'utf8')
    const flow = read('../features/tarot/MiniappTarotFlow.tsx')
    const styles = read('../features/tarot/MiniappTarotFlow.scss')
    const me = read('../pages/me/index.tsx')
    const hook = read('../hooks/useMotionPreference.ts')
    expect(flow).toContain('useMotionPreference()')
    expect(flow).toContain('`motion-${motionPreference}`')
    expect(styles).toContain('.miniapp-tarot.motion-reduced')
    expect(styles).toContain('.miniapp-tarot:not(.motion-standard)')
    expect(styles).toContain('animation-iteration-count: 1 !important')
    expect(styles).toContain('animation-delay: 0ms !important')
    expect(styles).toContain('transition-delay: 0ms !important')
    expect(hook).toContain('subscribeMotionPreference')
    expect(me).toContain('setMotionPreference(pref)')
    expect(me).toContain('简洁仅减少动效，不减少塔罗流程')
    expect(me).toContain('if (setHapticsEnabled(enabled))')
  })
})
