import { describe, expect, it } from 'vitest'
import { MBTI_TEST } from './mbtiTest'
import { scoreTest } from '../testEngine'

const DIM_IDS = ['EI', 'SN', 'TF', 'JP'] as const
const LETTERS: Record<string, [string, string]> = {
  EI: ['E', 'I'],
  SN: ['N', 'S'],
  TF: ['T', 'F'],
  JP: ['J', 'P'],
}

/** 构造指定四字母结果的答案：dim 命中第一字母极答 0，否则答 1 */
function answersFor(type: string): number[] {
  return MBTI_TEST.questions.map((question) => {
    const dimIndex = DIM_IDS.indexOf(question.dim as (typeof DIM_IDS)[number])
    return type[dimIndex] === LETTERS[question.dim!][0] ? 0 : 1
  })
}

describe('MBTI test definition', () => {
  it('keeps the migrated 28-question structure with 2 options each', () => {
    expect(MBTI_TEST.questions).toHaveLength(28)
    for (const question of MBTI_TEST.questions) {
      expect(question.options).toHaveLength(2)
      expect(DIM_IDS).toContain(question.dim)
    }
    expect(MBTI_TEST.questions.filter((q) => q.dim === 'EI')).toHaveLength(7)
    expect(MBTI_TEST.questions.filter((q) => q.dim === 'SN')).toHaveLength(7)
    expect(MBTI_TEST.questions.filter((q) => q.dim === 'TF')).toHaveLength(7)
    expect(MBTI_TEST.questions.filter((q) => q.dim === 'JP')).toHaveLength(7)
  })

  it('defines all 16 reports with non-empty copy', () => {
    const ids = Object.keys(MBTI_TEST.reports)
    expect(ids).toHaveLength(16)
    for (const id of ids) {
      const report = MBTI_TEST.reports[id]
      expect(report.title).toBeTruthy()
      expect(report.tagline).toBeTruthy()
      expect(report.summary.length).toBeGreaterThan(20)
      expect(report.detail).toHaveLength(3)
    }
  })

  it.each(['INTJ', 'INFP', 'ESTJ', 'ESFP'])('scores %s from polarized answers', (type) => {
    expect(scoreTest(MBTI_TEST, answersFor(type)).reportId).toBe(type)
  })

  it('never mentions the Pet10 pet brand in migrated copy', () => {
    const serialized = JSON.stringify(MBTI_TEST)
    expect(serialized).not.toContain('小多利')
    expect(serialized).not.toContain('Pet10')
  })
})
