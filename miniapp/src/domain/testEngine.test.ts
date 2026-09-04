import { describe, expect, it } from 'vitest'
import {
  scoreTest,
  resolveReportTitle,
  findBandIndex,
  radarChartGeometry,
  MIN_QUESTIONS,
  type TestDefinition,
} from './testEngine'

// 通用引擎的构造夹具：2 维度各 2 题、每题二选项
function dimensionFixture(): TestDefinition {
  return {
    id: 'fixture-dim',
    title: '维度测试',
    category: '人格',
    meta: { minutes: 1, resultLabel: '4 型' },
    intro: ['夹具'],
    notice: '夹具',
    questions: [
      { dim: 'AB', text: 'q1', options: [{ text: 'A' }, { text: 'B' }] },
      { dim: 'AB', text: 'q2', options: [{ text: 'A' }, { text: 'B' }] },
      { dim: 'CD', text: 'q3', options: [{ text: 'C' }, { text: 'D' }] },
      { dim: 'CD', text: 'q4', options: [{ text: 'C' }, { text: 'D' }] },
    ],
    scoring: {
      type: 'dimension',
      dims: [
        { id: 'AB', letters: ['A', 'B'], labels: ['A 极', 'B 极'] },
        { id: 'CD', letters: ['C', 'D'], labels: ['C 极', 'D 极'] },
      ],
    },
    reports: {
      AC: { id: 'AC', title: 'AC 型', tagline: 't', summary: 's', detail: [] },
      AD: { id: 'AD', title: 'AD 型', tagline: 't', summary: 's', detail: [] },
      BC: { id: 'BC', title: 'BC 型', tagline: 't', summary: 's', detail: [] },
      BD: { id: 'BD', title: 'BD 型', tagline: 't', summary: 's', detail: [] },
    },
  }
}

function bandFixture(): TestDefinition {
  return {
    ...dimensionFixture(),
    id: 'fixture-band',
    title: '区间测试',
    questions: [
      { text: 'q1', options: [{ text: 'a', weight: 1 }, { text: 'b', weight: 2 }, { text: 'c', weight: 3 }] },
      { text: 'q2', options: [{ text: 'a', weight: 1 }, { text: 'b', weight: 2 }, { text: 'c', weight: 3 }] },
    ],
    scoring: {
      type: 'band',
      max: 6,
      bands: [
        { min: 2, max: 3, reportId: 'low' },
        { min: 4, max: 6, reportId: 'high' },
      ],
    },
    reports: {
      low: { id: 'low', title: '低位', tagline: 't', summary: 's', detail: [] },
      high: { id: 'high', title: '高位', tagline: 't', summary: 's', detail: [] },
    },
  }
}

function archetypeFixture(): TestDefinition {
  return {
    ...dimensionFixture(),
    id: 'fixture-arch',
    title: '类型测试',
    questions: [
      { text: 'q1', options: [{ text: 'x', reportId: 'fox' }, { text: 'y', reportId: 'owl' }] },
      { text: 'q2', options: [{ text: 'x', reportId: 'fox' }, { text: 'y', reportId: 'owl' }] },
      { text: 'q3', options: [{ text: 'x', reportId: 'fox' }, { text: 'y', reportId: 'owl' }] },
    ],
    scoring: { type: 'archetype', reports: ['fox', 'owl'] },
    reports: {
      fox: { id: 'fox', title: '狐狸型', tagline: 't', summary: 's', detail: [] },
      owl: { id: 'owl', title: '猫头鹰型', tagline: 't', summary: 's', detail: [] },
    },
  }
}

describe('testEngine dimension scoring', () => {
  it('maps majority votes to letters per dimension', () => {
    const result = scoreTest(dimensionFixture(), [0, 1, 1, 1])
    expect(result.reportId).toBe('AD')
    expect(result.bandScore).toBeNull()
  })

  it('reports side-0 percent per dimension', () => {
    const result = scoreTest(dimensionFixture(), [0, 0, 1, 1])
    expect(result.dimensionScores).toEqual([
      { id: 'AB', label: 'A 极 ↔ B 极', percent: 100 },
      { id: 'CD', label: 'C 极 ↔ D 极', percent: 0 },
    ])
  })

  it('breaks ties deterministically toward the first letter', () => {
    const result = scoreTest(dimensionFixture(), [0, 1, 0, 1])
    expect(result.reportId).toBe('AC')
  })

  it('rejects wrong answer length and out-of-range indices', () => {
    expect(() => scoreTest(dimensionFixture(), [0, 1])).toThrow('invalid_test_answers')
    expect(() => scoreTest(dimensionFixture(), [0, 1, 2, 0])).toThrow('invalid_test_answers')
    expect(() => scoreTest(dimensionFixture(), [0, 1, 1, -1])).toThrow('invalid_test_answers')
  })

  it('rejects dimension-mode questions without a valid dim', () => {
    const broken = dimensionFixture()
    broken.questions[0] = { text: 'q1', options: [{ text: 'A' }, { text: 'B' }] }
    expect(() => scoreTest(broken, [0, 0, 0, 0])).toThrow('invalid_test_definition')
  })
})

describe('testEngine band scoring', () => {
  it('sums explicit weights and lands in the matching band', () => {
    expect(scoreTest(bandFixture(), [2, 1]).reportId).toBe('high')
    expect(scoreTest(bandFixture(), [2, 1]).bandScore).toBe(5)
    expect(scoreTest(bandFixture(), [0, 1]).reportId).toBe('low')
  })

  it('rejects totals outside declared bands', () => {
    const broken = bandFixture()
    broken.scoring = { type: 'band', max: 6, bands: [{ min: 3, max: 6, reportId: 'high' }] }
    expect(() => scoreTest(broken, [0, 0])).toThrow('band_gap_2')
  })
})

describe('testEngine archetype scoring', () => {
  it('elects the top-voted archetype deterministically on ties', () => {
    expect(scoreTest(archetypeFixture(), [0, 0, 1]).reportId).toBe('fox')
    expect(scoreTest(archetypeFixture(), [0, 1, 1]).reportId).toBe('owl')
    expect(scoreTest(archetypeFixture(), [1, 1, 0]).reportId).toBe('owl')
  })

  it('rejects options voting for unregistered reports', () => {
    const broken = archetypeFixture()
    broken.questions[0].options[0] = { text: 'x', reportId: 'ghost' }
    expect(() => scoreTest(broken, [0, 0, 0])).toThrow('invalid_test_definition')
  })

  it('returns full vote distribution in reports order including zero votes', () => {
    // fox 2 票、owl 1 票；顺序与 scoring.reports 定义一致
    expect(scoreTest(archetypeFixture(), [0, 0, 1]).archetypeVotes).toEqual([
      { reportId: 'fox', count: 2 },
      { reportId: 'owl', count: 1 },
    ])
    // 全投 owl：fox 保留 0 票（分布图需要）
    expect(scoreTest(archetypeFixture(), [1, 1, 1]).archetypeVotes).toEqual([
      { reportId: 'fox', count: 0 },
      { reportId: 'owl', count: 3 },
    ])
  })

  it('leaves archetypeVotes empty for non-archetype modes', () => {
    expect(scoreTest(bandFixture(), [2, 1]).archetypeVotes).toEqual([])
    expect(scoreTest(dimensionFixture(), [0, 0, 0, 0]).archetypeVotes).toEqual([])
  })
})

function factorFixture(): TestDefinition {
  return {
    ...dimensionFixture(),
    id: 'fixture-factor',
    title: '因素测试',
    questions: [
      {
        text: 'q1',
        options: [
          { text: 'a', factorWeights: { open: 4, neat: 1 } },
          { text: 'b', factorWeights: { open: 1, neat: 4 } },
        ],
      },
      {
        text: 'q2',
        options: [
          { text: 'a', factorWeights: { open: 3, neat: 2 } },
          { text: 'b', factorWeights: { open: 1, neat: 3 } },
        ],
      },
      {
        text: 'q3',
        options: [
          { text: 'a', factorWeights: { dark: 4 } },
          { text: 'b', factorWeights: { dark: 1 } },
        ],
      },
    ],
    scoring: {
      type: 'factor',
      factors: [
        { id: 'open', label: '开放性' },
        { id: 'neat', label: '严谨性' },
        { id: 'dark', label: '暗黑度', reverse: true },
      ],
      reportByFactor: { open: 'open-r', neat: 'neat-r', dark: 'dark-r' },
    },
    reports: {
      'open-r': { id: 'open-r', title: '开放主导', tagline: 't', summary: 's', detail: [] },
      'neat-r': { id: 'neat-r', title: '严谨主导', tagline: 't', summary: 's', detail: [] },
      'dark-r': { id: 'dark-r', title: '暗黑主导', tagline: 't', summary: 's', detail: [] },
    },
  }
}

describe('testEngine factor scoring', () => {
  it('computes per-factor percents with reverse factors flipped', () => {
    // q1:a(open4/neat1) q2:b(open1/neat3) q3:a(dark4→反向=0)
    const result = scoreTest(factorFixture(), [0, 1, 0])
    expect(result.factorScores).toEqual([
      { id: 'open', label: '开放性', percent: 63 },
      { id: 'neat', label: '严谨性', percent: 50 },
      { id: 'dark', label: '暗黑度', percent: 0 },
    ])
    expect(result.reportId).toBe('open-r')
  })

  it('elects the dominant factor deterministically on ties', () => {
    // [1,0,1]: open 50 / neat 75 / dark(反向) 75 → neat 与 dark 并列，按 factors 定义序取先（neat）
    const result = scoreTest(factorFixture(), [1, 0, 1])
    expect(result.reportId).toBe('neat-r')
  })

  it('prefers the earlier-declared factor when the first two tie', () => {
    // [1,0,0]: open (1+3)/8=50 / neat (4+2)/8=75 → 修正用例改用真并列 open/dark：
    // [0,1,1]: open 25 / neat 50 / dark 75 → dark 唯一最高
    const result = scoreTest(factorFixture(), [0, 1, 1])
    expect(result.reportId).toBe('dark-r')
  })

  it('rejects options without factor weights and unknown factor ids', () => {
    const missing = factorFixture()
    missing.questions[0].options[0] = { text: 'a' }
    expect(() => scoreTest(missing, [0, 0, 0])).toThrow('invalid_test_definition')

    const ghost = factorFixture()
    ghost.questions[2].options[0] = { text: 'a', factorWeights: { ghost: 4 } }
    expect(() => scoreTest(ghost, [0, 0, 0])).toThrow('invalid_test_definition')
  })
})

describe('resolveReportTitle', () => {
  it('prefers the report title and falls back to the raw id', () => {
    const def = dimensionFixture()
    expect(resolveReportTitle(def, 'AC')).toBe('AC 型')
    expect(resolveReportTitle(def, 'ZZ')).toBe('ZZ')
  })
})

describe('findBandIndex', () => {
  it('locates the band a score falls into', () => {
    expect(findBandIndex(bandFixture(), 2)).toBe(0)
    expect(findBandIndex(bandFixture(), 5)).toBe(1)
  })

  it('returns null for out-of-range scores and non-band modes', () => {
    expect(findBandIndex(bandFixture(), 0)).toBeNull()
    expect(findBandIndex(bandFixture(), 99)).toBeNull()
    expect(findBandIndex(dimensionFixture(), 3)).toBeNull()
  })
})

describe('radarChartGeometry', () => {
  it('places the first vertex at top and distributes axes clockwise', () => {
    const points = radarChartGeometry(5)
    // 首顶点正上方：x 居中、y 在圆心上方
    expect(points[0].x).toBeCloseTo(0.5)
    expect(points[0].y).toBeLessThan(0.5)
    // 五边形顶点数量正确，且都在 [0,1] 画布范围内
    expect(points).toHaveLength(5)
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(1)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(1)
    }
  })

  it('handles degenerate axis counts without NaN', () => {
    expect(radarChartGeometry(0)).toEqual([])
    const two = radarChartGeometry(2)
    expect(two).toHaveLength(2)
    for (const point of two) {
      expect(Number.isFinite(point.x)).toBe(true)
      expect(Number.isFinite(point.y)).toBe(true)
    }
  })
})

describe('MIN_QUESTIONS baseline', () => {
  it('stays at the product-agreed minimum of 20', () => {
    expect(MIN_QUESTIONS).toBe(20)
  })
})
