import { describe, expect, it } from 'vitest'
import { parseTestRecords, appendRecord, type TestRecord } from './testRecords'

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
