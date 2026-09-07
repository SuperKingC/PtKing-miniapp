import { describe, expect, it } from 'vitest'
import type { TestDefinition } from '../domain/testEngine'
import { matchTests, pickRecommendedTests } from './testDiscovery'

function stub(id: string, category: TestDefinition['category'], intro = ''): TestDefinition {
  return {
    id,
    title: id,
    category,
    meta: { minutes: 1, resultLabel: '结果' },
    intro: intro ? [intro] : [],
    notice: '',
    questions: [{ text: 'q', options: [{ text: 'a' }, { text: 'b' }] }],
    scoring: { type: 'band', max: 1, bands: [{ min: 0, max: 1, reportId: 'ok' }] },
    reports: { ok: { id: 'ok', title: '结果', tagline: '', summary: '', detail: [] } },
  }
}

describe('pickRecommendedTests', () => {
  const definitions = [
    stub('mbti', '人格'),
    stub('love', '情感'),
    stub('crush', '情感'),
    stub('office', '职场'),
    stub('goofy', '趣味'),
  ]

  it('prefers unseen tests in recently used categories', () => {
    const picked = pickRecommendedTests(definitions, ['love'], undefined, 3)
    expect(picked.map((item) => item.id)).toEqual(['crush', 'mbti', 'office'])
  })

  it('skips the in-progress test and fills from registry order', () => {
    const picked = pickRecommendedTests(definitions, [], 'mbti', 2)
    expect(picked.map((item) => item.id)).toEqual(['love', 'crush'])
  })
})

describe('matchTests', () => {
  const definitions = [
    stub('mbti', '人格', '十六型性格速测'),
    stub('love', '情感'),
  ]

  it('matches title, category and intro', () => {
    expect(matchTests(definitions, '人格').map((item) => item.id)).toEqual(['mbti'])
    expect(matchTests(definitions, '十六型').map((item) => item.id)).toEqual(['mbti'])
    expect(matchTests(definitions, 'love').map((item) => item.id)).toEqual(['love'])
    expect(matchTests(definitions, '没有这个').map((item) => item.id)).toEqual([])
  })
})
