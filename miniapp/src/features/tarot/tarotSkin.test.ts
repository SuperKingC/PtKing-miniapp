import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTarotSkin, setTarotSkin, TAROT_SKIN_LABELS, TAROT_SKIN_ORDER } from './tarotSkin'

type StorageLike = { getStorageSync: (key: string) => unknown; setStorageSync: (key: string, value: unknown) => void }

describe('tarot skin preference', () => {
  let storage: Record<string, unknown>

  beforeEach(() => {
    storage = {}
    ;(globalThis as { wx?: StorageLike }).wx = {
      getStorageSync: (key: string) => storage[key],
      setStorageSync: (key: string, value: unknown) => { storage[key] = value },
    }
  })

  afterEach(() => {
    delete (globalThis as { wx?: unknown }).wx
  })

  it('defaults to clay when nothing stored', () => {
    expect(getTarotSkin()).toBe('clay')
  })

  it('round-trips a stored classic preference', () => {
    setTarotSkin('classic')
    expect(getTarotSkin()).toBe('classic')
  })

  it('folds unknown stored values back to clay', () => {
    storage['ptking_tarot_skin'] = 'neon'
    expect(getTarotSkin()).toBe('clay')
  })

  it('falls back to clay without wx global', () => {
    delete (globalThis as { wx?: unknown }).wx
    expect(getTarotSkin()).toBe('clay')
    expect(() => setTarotSkin('classic')).not.toThrow()
  })

  it('exposes labels and order for the picker', () => {
    expect(TAROT_SKIN_ORDER).toEqual(['clay', 'classic'])
    expect(TAROT_SKIN_LABELS.clay).toBe('猫咪占卜屋')
    expect(TAROT_SKIN_LABELS.classic).toBe('星夜圣殿')
  })

  it('survives storage write failures', () => {
    ;(globalThis as { wx?: StorageLike }).wx = {
      getStorageSync: () => 'classic',
      setStorageSync: () => { throw new Error('quota exceeded') },
    }
    expect(() => setTarotSkin('clay')).not.toThrow()
    expect(getTarotSkin()).toBe('classic')
  })
})
