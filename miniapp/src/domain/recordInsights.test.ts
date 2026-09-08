import { describe, expect, it } from 'vitest'
import { buildRecordInsight } from './recordInsights'
import type { TestRecord } from '../services/testRecords'
const r = (score: number, signature?: string): TestRecord => ({ testId: 'x', finishedAt: String(score), contentSignature: signature, result: { reportId: 'a', dimensionScores: [], bandScore: score, factorScores: [] } })
describe('record insights', () => {
  it('summarizes neutral delta', () => expect(buildRecordInsight([r(12), r(10)])?.message).toBe('与上次相差 +2'))
  it('does not compare mismatched versions', () => expect(buildRecordInsight([r(12, 'new'), r(10, 'old')], false)?.delta).toBeNull())
})
