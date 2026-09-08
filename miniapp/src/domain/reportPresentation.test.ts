import { describe, expect, it } from 'vitest'
import { buildReportPresentation } from './reportPresentation'

describe('reportPresentation', () => {
  it('explains normalized scores and neutral retest', () => {
    const result = buildReportPresentation({ score: 72, top: 'A', second: 'B', previous: 'A' })
    expect(result.scoreNote).toContain('不是人群百分位')
    expect(result.retestNote).toContain('中性')
    expect(result.typeNote).toContain('接近')
  })
})
