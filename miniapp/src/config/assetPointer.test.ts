import { describe, expect, it } from 'vitest'
import {
  pickGitChannelTag,
  pickPreferredGitTag,
  pickReleaseChannel,
  parseAssetPointer,
  readChannelArg,
  resolveChannelName,
} from '../../../scripts/asset-pointer.mjs'

describe('asset pointer', () => {
  it('splits a baked player URL into prefix and version', () => {
    const pointer = parseAssetPointer(
      'https://ptking-assets-1300973162.cos.ap-guangzhou.myqcloud.com/assets/ptking/c958df7/',
    )
    expect(pointer.prefix).toBe('assets/ptking')
    expect(pointer.version).toBe('c958df7')
    expect(pointer.base).toBe(
      'https://ptking-assets-1300973162.cos.ap-guangzhou.myqcloud.com/assets/ptking/c958df7',
    )
  })

  it('keeps a stable channel name like v1', () => {
    const pointer = parseAssetPointer('https://cdn.example.com/assets/ptking/v1')
    expect(pointer.version).toBe('v1')
    expect(pointer.prefix).toBe('assets/ptking')
  })
})

describe('channel from release branch or git tag', () => {
  it('prefers a version-like tag on HEAD over the nearest ancestor tag', () => {
    expect(pickPreferredGitTag(['notes', 'v1.0.0', 'v1.0.1'])).toBe('v1.0.1')
    expect(pickGitChannelTag(['v1.0.0'], 'v0.9.0')).toBe('v1.0.0')
    expect(pickGitChannelTag([], 'v1.0.0')).toBe('v1.0.0')
    expect(pickGitChannelTag([], '')).toBe('')
  })

  it('reads the trailing version segment from release branches', () => {
    expect(pickReleaseChannel('release/1.0.0')).toBe('1.0.0')
    expect(pickReleaseChannel('release/v1.0.0')).toBe('v1.0.0')
    expect(pickReleaseChannel('Release/1.0.0-hotfix')).toBe('1.0.0-hotfix')
    expect(pickReleaseChannel('feat/release-notes')).toBe('')
    expect(pickReleaseChannel('main')).toBe('')
  })

  it('treats bare --channel as auto-detect, and an explicit name as override', () => {
    expect(readChannelArg(['--yes', '--build'])).toEqual({ requested: false, explicit: '' })
    expect(readChannelArg(['--channel', '--yes'])).toEqual({ requested: true, explicit: '' })
    expect(readChannelArg(['--channel', 'v1'])).toEqual({ requested: true, explicit: 'v1' })
    expect(resolveChannelName(['--channel'], { branchName: 'release/1.0.0', tagsOnHead: ['v0.9.0'] })).toBe('1.0.0')
    expect(resolveChannelName(['--channel'], { tagsOnHead: ['v1.0.0'] })).toBe('v1.0.0')
    expect(resolveChannelName(['--channel', 'beta'], { branchName: 'release/1.0.0' })).toBe('beta')
    expect(() => resolveChannelName(['--channel'], { tagsOnHead: [], nearestTag: '' })).toThrow(/频道名/)
  })
})
