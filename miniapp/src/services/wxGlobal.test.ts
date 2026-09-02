import { describe, expect, it } from 'vitest'
import { getWxGlobal } from './wxGlobal'

describe('wxGlobal helper', () => {
  it('returns undefined in node/vitest where no wx exists', () => {
    expect(getWxGlobal()).toBeUndefined()
  })

  it('reads from globalThis.wx as a fallback', () => {
    ;(globalThis as { wx?: unknown }).wx = { getStorageSync: () => '' }
    try {
      expect(getWxGlobal()?.getStorageSync?.('k')).toBe('')
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })
})
