import type { TestRecord } from '../services/testRecords'

export type RecordCategory = '全部' | '人格' | '情感' | '职场' | '趣味'

export interface RecordInsight {
  testId: string
  attempts: number
  delta: number | null
  message: string
}

export function filterRecords(records: TestRecord[], category: RecordCategory, categories: Record<string, RecordCategory>): TestRecord[] {
  if (category === '全部') return records
  return records.filter((record) => categories[record.testId] === category)
}

export function buildRecordInsight(history: TestRecord[], sameVersion = true): RecordInsight | null {
  if (!history.length) return null
  const latest = history[0]
  const previous = history[1]
  const delta = sameVersion && previous && typeof latest.result.bandScore === 'number' && typeof previous.result.bandScore === 'number'
    ? latest.result.bandScore - previous.result.bandScore : null
  return { testId: latest.testId, attempts: history.length, delta, message: delta === null ? '暂无可比的分数变化' : `与上次相差 ${delta > 0 ? '+' : ''}${delta}` }
}
