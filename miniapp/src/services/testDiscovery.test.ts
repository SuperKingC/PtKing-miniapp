import { describe, expect, it } from 'vitest'
import type { TestDefinition } from '../domain/testEngine'
import { getTestDefinition } from './testRegistry'
import { matchTests, NEW_USER_RECOMMEND_IDS, pickRecommendedTests } from './testDiscovery'

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

  it('pins new-user defaults in listed order when there is no history', () => {
    const catalog = [
      stub('office', '职场'),
      stub('chiikawa-bond', '趣味'),
      stub('xp-test', '人格'),
      stub('love-persona', '情感'),
      stub('mbti', '人格'),
      stub('goofy', '趣味'),
    ]
    const picked = pickRecommendedTests(catalog, [], undefined, 4)
    expect(NEW_USER_RECOMMEND_IDS).toEqual(['mbti', 'love-persona', 'xp-test', 'chiikawa-bond'])
    expect(picked.map((item) => item.id)).toEqual([...NEW_USER_RECOMMEND_IDS])
    expect(NEW_USER_RECOMMEND_IDS.map((id) => getTestDefinition(id)?.title)).toEqual([
      'MBTI 人格测试',
      '恋爱人格测试',
      'XP 测试',
      'Chiikawa中谁和你最有缘',
    ])
  })

  it('skips an in-progress default and backfills from the rest of the catalog', () => {
    const catalog = [
      stub('mbti', '人格'),
      stub('love-persona', '情感'),
      stub('xp-test', '人格'),
      stub('chiikawa-bond', '趣味'),
      stub('office', '职场'),
    ]
    const picked = pickRecommendedTests(catalog, [], 'mbti', 4)
    expect(picked.map((item) => item.id)).toEqual(['love-persona', 'xp-test', 'chiikawa-bond', 'office'])
  })

  it('prefers unseen tests in recently used categories', () => {
    const picked = pickRecommendedTests(definitions, ['love'], undefined, 3)
    expect(picked.map((item) => item.id)).toEqual(['crush', 'mbti', 'office'])
  })

  it('skips the in-progress test and still spreads across categories', () => {
    const picked = pickRecommendedTests(definitions, [], 'mbti', 2)
    expect(picked.map((item) => item.id)).toEqual(['love', 'office'])
  })

  it('never returns a single category while another has an unused slot', () => {
    // 4 分类 × 4 槽：每个分类各出 1 个，不能整块同类
    const picked = pickRecommendedTests(definitions, ['love', 'crush'], undefined, 4)
    expect(new Set(picked.map((item) => item.category)).size).toBe(4)
  })

  it('backfills a category only after every category has contributed one', () => {
    const many = [
      stub('mbti', '人格'),
      stub('bigfive', '人格'),
      stub('love', '情感'),
      stub('office', '职场'),
      stub('goofy', '趣味'),
    ]
    const picked = pickRecommendedTests(many, ['love'], undefined, 5)
    expect(picked.map((item) => item.id)).toEqual(['love', 'mbti', 'office', 'goofy', 'bigfive'])
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
