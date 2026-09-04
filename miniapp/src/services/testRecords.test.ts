import { describe, expect, it } from 'vitest'
import {
  parseTestRecords,
  appendRecord,
  loadTestRecords,
  saveTestRecord,
  type TestRecord,
} from './testRecords'

const sample: TestRecord = {
  testId: 'mbti',
  finishedAt: '2026-09-02T10:00:00.000Z',
  result: { reportId: 'INTJ', dimensionScores: [], bandScore: null },
}

describe('testRecords parsing', () => {
  it('returns an empty list for the empty-string storage that Taro returns when unset', () => {
    expect(parseTestRecords('')).toEqual([])
  })

  it('parses a valid JSON payload', () => {
    expect(parseTestRecords(JSON.stringify([sample]))).toEqual([sample])
  })

  it('drops malformed items instead of throwing', () => {
    const raw = JSON.stringify([sample, { testId: 'x' }, 'junk', null])
    expect(parseTestRecords(raw)).toEqual([sample])
  })

  it('returns empty on corrupted JSON', () => {
    expect(parseTestRecords('not-json{')).toEqual([])
  })

  it('rejects non-string payloads (objects stored directly by older versions)', () => {
    expect(parseTestRecords({ foo: 1 })).toEqual([])
    expect(parseTestRecords(null)).toEqual([])
  })
})

describe('save/load round-trip', () => {
  it('round-trips a saved record through a wx storage mock', () => {
    // 回归锁定：曾因写侧存数组、读侧只认 JSON 字符串，记录落库后永远读不出来
    const memory = new Map<string, unknown>()
    ;(globalThis as { wx?: unknown }).wx = {
      setStorageSync: (key: string, value: unknown) => void memory.set(key, value),
      getStorageSync: (key: string) => memory.get(key) ?? '',
    }
    try {
      saveTestRecord(sample.testId, sample.result)
      const loaded = loadTestRecords()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].testId).toBe(sample.testId)
      expect(loaded[0].result).toEqual(sample.result)
      expect(typeof loaded[0].finishedAt).toBe('string')
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })
})

describe('appendRecord', () => {
  it('prepends the newest record', () => {
    const older: TestRecord = { ...sample, finishedAt: '2026-09-01T00:00:00.000Z' }
    const next = appendRecord([older], sample)
    expect(next[0]).toEqual(sample)
    expect(next).toHaveLength(2)
  })

  it('truncates to the max cap', () => {
    const many: TestRecord[] = Array.from({ length: 10 }, (_, i) => ({
      ...sample,
      finishedAt: `2026-09-01T00:00:0${i}.000Z`,
    }))
    expect(appendRecord(many, sample, 5)).toHaveLength(5)
  })
})
