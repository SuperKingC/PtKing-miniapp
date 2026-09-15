import { describe, expect, it } from 'vitest'
import { buildReportPresentation, resolveReportQuote } from './reportPresentation'

describe('reportPresentation', () => {
  it('explains normalized scores and neutral retest', () => {
    const result = buildReportPresentation({ score: 72, top: 'A', second: 'B', previous: 'A' })
    expect(result.scoreNote).toContain('不是人群百分位')
    expect(result.retestNote).toContain('中性')
    expect(result.typeNote).toContain('接近')
  })
})

describe('resolveReportQuote', () => {
  it('prefers the editorial quote when present', () => {
    expect(resolveReportQuote({ quote: '嘴硬是壳，心软是核。', deep: '深度长文第一句。第二句。' })).toBe('嘴硬是壳，心软是核。')
  })

  it('derives the first sentence from deep and clamps to 60 chars', () => {
    expect(resolveReportQuote({ deep: '第一句！第二句？第三句。' })).toBe('第一句！')
    expect(resolveReportQuote({ deep: '没有句号就一直说下去' })).toBe('没有句号就一直说下去')
    const quote = resolveReportQuote({ deep: `${'长'.repeat(70)}。` })
    expect(quote.length).toBe(60)
    expect(quote.endsWith('…')).toBe(true)
  })

  it('returns empty when neither quote nor deep exists (old records zero-breakage)', () => {
    expect(resolveReportQuote({})).toBe('')
    expect(resolveReportQuote({ quote: '   ' })).toBe('')
  })
})
