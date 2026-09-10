import type { TestRecord } from '../services/testRecords'

export type RecordCategory = '全部' | '人格' | '情感' | '职场' | '趣味'

export interface RecordInsight {
  testId: string
  attempts: number
  delta: number | null
  message: string
}

export function shortenLabel(text: string, max = 6): string {
  const value = text.trim()
  if (!value) return '—'
  return value.length > max ? `${value.slice(0, max)}…` : value
}

export const RECORD_CATEGORY_TONE: Record<Exclude<RecordCategory, '全部'>, string> = {
  人格: 'violet',
  情感: 'rose',
  职场: 'blue',
  趣味: 'amber',
}

export function recordCategoryTone(category: string | undefined): string {
  if (category === '情感' || category === '职场' || category === '趣味' || category === '人格') {
    return RECORD_CATEGORY_TONE[category]
  }
  return 'violet'
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
