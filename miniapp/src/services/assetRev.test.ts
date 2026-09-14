import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readAssetRev, rememberAssetRev, withAssetRev } from './assetRev'

describe('asset rev cache buster', () => {
  const storage = new Map<string, unknown>()

  beforeEach(() => {
    storage.clear()
    ;(globalThis as { wx?: unknown }).wx = {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => { storage.set(key, value) },
    }
  })

  afterEach(() => {
    delete (globalThis as { wx?: unknown }).wx
  })

  it('leaves urls unchanged until a rev is remembered', () => {
    expect(readAssetRev()).toBe('')
    expect(withAssetRev('https://cos.example.com/tarot/ui/card-back.jpg')).toBe(
      'https://cos.example.com/tarot/ui/card-back.jpg',
    )
    expect(rememberAssetRev('')).toBe(false)
    expect(rememberAssetRev(1)).toBe(false)
  })

  it('appends r= and only reports a change when the rev is new', () => {
    expect(rememberAssetRev('2026-09-14T07:00:00.000Z')).toBe(true)
    expect(rememberAssetRev('2026-09-14T07:00:00.000Z')).toBe(false)
    expect(readAssetRev()).toBe('2026-09-14T07:00:00.000Z')
    expect(withAssetRev('https://cos.example.com/tarot/ui/card-back.jpg')).toBe(
      'https://cos.example.com/tarot/ui/card-back.jpg?r=2026-09-14T07%3A00%3A00.000Z',
    )
    expect(rememberAssetRev('2026-09-14T08:00:00.000Z')).toBe(true)
  })
})
