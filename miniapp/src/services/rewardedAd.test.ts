import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WxLike } from './wxGlobal'

interface AdSpy {
  show: () => Promise<void>
  load: () => Promise<void>
  onClose: (cb: (res: { isEnded?: boolean }) => void) => void
  onError: (cb: (error: unknown) => void) => void
}

/** 组装 wx mock：createRewardedVideoAd 返回可控假广告，closeCb/errorCb 供用例手动触发 */
function makeWxMock(adBehavior: Partial<AdSpy>) {
  let closeCb: ((res: { isEnded?: boolean }) => void) | null = null
  let errorCb: ((error: unknown) => void) | null = null
  const wxMock: Partial<WxLike> = {
    createRewardedVideoAd: () => ({
      show: adBehavior.show ?? (async () => {}),
      load: adBehavior.load ?? (async () => {}),
      onClose: (cb) => {
        closeCb = cb
      },
      onError: (cb) => {
        errorCb = cb
      },
    }),
  }
  return {
    wxMock,
    fireClose: (res: { isEnded?: boolean }) => closeCb?.(res),
    fireError: () => errorCb?.(new Error('no fill')),
  }
}

function loadAdWithWx(wxMock: Partial<WxLike> | undefined, unitId: string | null) {
  vi.resetModules()
  const globalScope = globalThis as { wx?: unknown; TARO_AD_UNIT_ID?: string }
  if (wxMock === undefined) delete globalScope.wx
  else globalScope.wx = wxMock
  if (unitId === null) delete globalScope.TARO_AD_UNIT_ID
  else globalScope.TARO_AD_UNIT_ID = unitId
  return import('./rewardedAd')
}

afterEach(() => {
  const globalScope = globalThis as { wx?: unknown; TARO_AD_UNIT_ID?: string }
  delete globalScope.wx
  delete globalScope.TARO_AD_UNIT_ID
})

describe('resolveAdOutcome (pure)', () => {
  it('maps unit id / completion / error state to the three outcomes', async () => {
    const mod = await loadAdWithWx(undefined, null)
    expect(mod.resolveAdOutcome('', true, false)).toBe('unavailable')
    expect(mod.resolveAdOutcome('unit', true, false)).toBe('completed')
    expect(mod.resolveAdOutcome('unit', false, false)).toBe('aborted')
    expect(mod.resolveAdOutcome('unit', true, true)).toBe('unavailable')
  })

  it('reports whether the ad unit is configured (gate only when configured)', async () => {
    const unconfigured = await loadAdWithWx({}, null)
    expect(unconfigured.isRewardedAdConfigured()).toBe(false)
    const configured = await loadAdWithWx({}, 'unit_123')
    expect(configured.isRewardedAdConfigured()).toBe(true)
  })
})

describe('showRewardedAd', () => {
  it('resolves unavailable when no ad unit id is configured', async () => {
    const mod = await loadAdWithWx({}, null)
    await expect(mod.showRewardedAd()).resolves.toBe('unavailable')
  })

  it('resolves unavailable when wx lacks the ad API', async () => {
    const mod = await loadAdWithWx({}, 'unit_123')
    await expect(mod.showRewardedAd()).resolves.toBe('unavailable')
  })

  it('resolves completed only when the video was watched to the end', async () => {
    const mock = makeWxMock({})
    const mod = await loadAdWithWx(mock.wxMock, 'unit_123')
    const pending = mod.showRewardedAd()
    mock.fireClose({ isEnded: true })
    await expect(pending).resolves.toBe('completed')
  })

  it('resolves aborted when the user closes the video midway', async () => {
    const mock = makeWxMock({})
    const mod = await loadAdWithWx(mock.wxMock, 'unit_123')
    const pending = mod.showRewardedAd()
    mock.fireClose({ isEnded: false })
    await expect(pending).resolves.toBe('aborted')
  })

  it('degrades to unavailable when show keeps failing (ad failure never blocks the report)', async () => {
    const mock = makeWxMock({
      show: () => Promise.reject(new Error('show fail')),
      load: () => Promise.reject(new Error('load fail')),
    })
    const mod = await loadAdWithWx(mock.wxMock, 'unit_123')
    await expect(mod.showRewardedAd()).resolves.toBe('unavailable')
  })

  it('treats an SDK error during playback as unavailable even if the close fires', async () => {
    const mock = makeWxMock({})
    const mod = await loadAdWithWx(mock.wxMock, 'unit_123')
    const pending = mod.showRewardedAd()
    mock.fireError()
    mock.fireClose({ isEnded: true })
    await expect(pending).resolves.toBe('unavailable')
  })
})
