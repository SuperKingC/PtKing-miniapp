import { describe, expect, it } from 'vitest'
import { resolveAssetBaseUrlForPlatform } from './assetBaseUrl'

describe('asset base url resolution', () => {
  it('uses the local mock base for the devtools simulator when a dev url is injected', () => {
    expect(
      resolveAssetBaseUrlForPlatform('devtools', 'https://cos.example.com/ptking-web/v1', 'http://127.0.0.1:8787'),
    ).toBe('http://127.0.0.1:8787')
  })

  it('falls back to the production base on real devices even when a dev url exists', () => {
    expect(
      resolveAssetBaseUrlForPlatform('ios', 'https://cos.example.com/ptking-web/v1', 'http://127.0.0.1:8787'),
    ).toBe('https://cos.example.com/ptking-web/v1')
    expect(
      resolveAssetBaseUrlForPlatform('android', 'https://cos.example.com/ptking-web/v1', 'http://127.0.0.1:8787'),
    ).toBe('https://cos.example.com/ptking-web/v1')
  })

  it('uses the production base when no dev url is injected', () => {
    expect(resolveAssetBaseUrlForPlatform('devtools', 'https://cos.example.com/ptking-web/v1', '')).toBe(
      'https://cos.example.com/ptking-web/v1',
    )
  })

  it('strips trailing slashes from both bases', () => {
    expect(resolveAssetBaseUrlForPlatform('devtools', 'https://cos.example.com/ptking-web/v1/', '')).toBe(
      'https://cos.example.com/ptking-web/v1',
    )
  })
})
