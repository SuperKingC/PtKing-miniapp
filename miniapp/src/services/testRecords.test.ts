import { describe, expect, it } from 'vitest'
import {
  buildHistoryRows,
  clearTestRecords,
  markRecordUnlocked,
  normalizeRecordLocks,
  parseTestRecords,
  appendRecord,
  loadTestRecords,
  saveTestRecord,
  unlockRecord,
  TEST_RECORDS_CAP,
  type TestRecord,
} from './testRecords'

const sample: TestRecord = {
  testId: 'mbti',
  finishedAt: '2026-09-02T10:00:00.000Z',
  result: { reportId: 'INTJ', dimensionScores: [], bandScore: null },
}

/** 锁定语义依赖「广告位已配置」：断言 locked=true 落库读回的用例需先注入广告位常量 */
function withAdConfigured(): void {
  ;(globalThis as { TARO_AD_UNIT_ID?: string }).TARO_AD_UNIT_ID = 'unit_test'
}

function withoutAdConfigured(): void {
  delete (globalThis as { TARO_AD_UNIT_ID?: string }).TARO_AD_UNIT_ID
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

describe('locked report + snapshot fields', () => {
  it('round-trips locked/title snapshots through a wx storage mock', () => {
    const memory = new Map<string, unknown>()
    ;(globalThis as { wx?: unknown }).wx = {
      setStorageSync: (key: string, value: unknown) => void memory.set(key, value),
      getStorageSync: (key: string) => memory.get(key) ?? '',
    }
    withAdConfigured()
    try {
      saveTestRecord(sample.testId, sample.result, {
        locked: true,
        testTitle: 'MBTI 人格测试',
        resultTitle: '建筑师',
      })
      const [loaded] = loadTestRecords()
      expect(loaded.locked).toBe(true)
      expect(loaded.testTitle).toBe('MBTI 人格测试')
      expect(loaded.resultTitle).toBe('建筑师')
    } finally {
      delete (globalThis as { wx?: unknown }).wx
      withoutAdConfigured()
    }
  })

  it('normalizeRecordLocks treats legacy locked records as unlocked when no ad unit is configured', () => {
    const locked: TestRecord = { ...sample, locked: true }
    expect(normalizeRecordLocks([locked], true)[0].locked).toBe(true)
    expect(normalizeRecordLocks([locked], false)[0].locked).toBe(false)
    // 未锁定记录不受影响
    expect(normalizeRecordLocks([sample], false)[0].locked).toBeUndefined()
  })

  it('loadTestRecords strips stale locks when the ad unit is absent (legacy dev records)', () => {
    const memory = new Map<string, unknown>()
    memory.set('ptking_test_records', JSON.stringify([{ ...sample, locked: true }]))
    ;(globalThis as { wx?: unknown }).wx = {
      setStorageSync: (key: string, value: unknown) => void memory.set(key, value),
      getStorageSync: (key: string) => memory.get(key) ?? '',
    }
    withoutAdConfigured()
    try {
      expect(loadTestRecords()[0].locked).toBe(false)
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })

  it('markRecordUnlocked flips only the exact testId+finishedAt match', () => {
    const lockedSample: TestRecord = { ...sample, locked: true }
    const other: TestRecord = { ...sample, testId: 'xp', finishedAt: '2026-09-01T00:00:00.000Z', locked: true }
    const next = markRecordUnlocked([lockedSample, other], lockedSample.testId, lockedSample.finishedAt)
    expect(next[0].locked).toBe(false)
    expect(next[1].locked).toBe(true)
  })

  it('unlockRecord persists the unlock through a wx storage mock', () => {
    const memory = new Map<string, unknown>()
    ;(globalThis as { wx?: unknown }).wx = {
      setStorageSync: (key: string, value: unknown) => void memory.set(key, value),
      getStorageSync: (key: string) => memory.get(key) ?? '',
    }
    try {
      saveTestRecord(sample.testId, sample.result, { locked: true })
      unlockRecord(sample.testId, loadTestRecords()[0].finishedAt)
      expect(loadTestRecords()[0].locked).toBe(false)
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })

  it('clearTestRecords removes everything', () => {
    const removed: string[] = []
    ;(globalThis as { wx?: unknown }).wx = {
      setStorageSync: () => {},
      getStorageSync: () => JSON.stringify([sample]),
      removeStorageSync: (key: string) => void removed.push(key),
    }
    try {
      clearTestRecords()
      expect(removed).toContain('ptking_test_records')
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })
})

describe('buildHistoryRows', () => {
  it('numbers attempts newest-first and diffs bandScore against the previous attempt', () => {
    const first: TestRecord = { ...sample, finishedAt: '2026-09-01T00:00:00.000Z', result: { ...sample.result, bandScore: 30 } }
    const second: TestRecord = { ...sample, finishedAt: '2026-09-02T00:00:00.000Z', result: { ...sample.result, bandScore: 36 } }
    const rows = buildHistoryRows([second, first])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ attempt: 2, delta: 6 })
    expect(rows[1]).toMatchObject({ attempt: 1, delta: null })
  })

  it('yields null deltas for tests without bandScore', () => {
    const rows = buildHistoryRows([sample, { ...sample, finishedAt: '2026-09-01T00:00:00.000Z' }])
    expect(rows.every((row) => row.delta === null)).toBe(true)
  })

  it('caps rows to maxRows', () => {
    const many: TestRecord[] = Array.from({ length: 6 }, (_, i) => ({
      ...sample,
      finishedAt: `2026-09-0${i + 1}T00:00:00.000Z`,
      result: { ...sample.result, bandScore: 20 + i },
    }))
    expect(buildHistoryRows(many, 4)).toHaveLength(4)
  })

  it('exposes the storage cap used by the records-page banner', () => {
    expect(TEST_RECORDS_CAP).toBe(200)
  })
})
