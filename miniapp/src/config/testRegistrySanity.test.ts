import { describe, expect, it } from 'vitest'
import { listTestDefinitions, TEST_LIST_ORDER } from '../services/testRegistry'
import { MIN_QUESTIONS, scoreTest } from '../domain/testEngine'

/**
 * 注册表级 sanity：所有上架测试必须结构完整、报告齐全、可被极化答案命中、
 * 文案合规（无品牌残留、无临床措辞）。新加测试自动纳入本套检查。
 */

const FORBIDDEN_WORDS = ['小多利', 'Pet10', '诊断', '抑郁症', '精神疾病', '治疗你的']
const CLINICAL_HINTS = [/确诊/, /病理/, /用药建议/]

describe('test registry sanity (all published tests)', () => {
  const definitions = listTestDefinitions()

  it('publishes the 2026-09 twenty-two-test lineup in a stable order', () => {
    expect(TEST_LIST_ORDER).toEqual([
      'mbti',
      'xp-test',
      'unhinged-test',
      'bigfive',
      'dark-triad',
      'love-persona',
      'repression-test',
      'sarcastic-test',
      'loser-talent',
      'attachment-style',
      'social-style',
      'single-power',
      'gift',
      'work-role',
      'eq',
      'burnout',
      'pet-persona',
      'goofy',
      'overthink',
      'sleep',
      'mind-age',
      'phone-addiction',
    ])
    expect(listTestDefinitions()).toHaveLength(22)
  })

  it('covers every category with at least one test', () => {
    const categories = new Set(listTestDefinitions().map((def) => def.category))
    for (const category of ['人格', '情感', '职场', '趣味']) {
      expect(categories.has(category as never)).toBe(true)
    }
  })

  it('keeps ids unique and kebab-cased', () => {
    const ids = definitions.map((def) => def.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it.each(definitions.map((def) => [def.id, def] as const))(
    '%s has complete structure and reachable reports',
    (_id, def) => {
      // 结构完整
      expect(def.title).toBeTruthy()
      expect(def.category).toMatch(/^(人格|情感|职场|趣味)$/)
      expect(def.meta.minutes).toBeGreaterThan(0)
      expect(def.meta.resultLabel).toBeTruthy()
      expect(def.intro.length).toBeGreaterThanOrEqual(2)
      expect(def.notice).toContain('免费')
      // 产品基准（2026-09）：题太少用户会觉得「不准」，全部上架测试不得低于 MIN_QUESTIONS
      expect(def.questions.length).toBeGreaterThanOrEqual(MIN_QUESTIONS)
      // 题目选项齐全、无重复文案
      for (const question of def.questions) {
        expect(question.options.length).toBeGreaterThanOrEqual(2)
      }
      // 每种报告的 reportId 均有定义且文案完整
      const reportIds = Object.keys(def.reports)
      expect(reportIds.length).toBeGreaterThanOrEqual(3)
      for (const report of Object.values(def.reports)) {
        expect(report.title).toBeTruthy()
        expect(report.tagline).toBeTruthy()
        expect(report.summary.length).toBeGreaterThan(20)
        expect(report.detail.length).toBe(3)
        // 深度报告 v2 字段（可选，恋爱人格样稿已铺）：有则校验质量
        if (report.deep !== undefined) {
          expect(report.deep.length).toBeGreaterThan(150)
          expect(report.strengths?.length).toBe(3)
          expect(report.blindSpots?.length).toBe(3)
          expect(report.scenes?.length).toBe(3)
          expect(report.actions?.length).toBeGreaterThanOrEqual(3)
        }
      }
    },
  )

  it.each(definitions.map((def) => [def.id, def] as const))(
    '%s can reach every report through the scoring engine',
    (_id, def) => {
      const optionCount = def.questions[0].options.length
      if (def.scoring.type === 'archetype') {
        // 每个 archetype 报告都要能被「全投它」的答案命中
        for (const target of def.scoring.reports) {
          const answers = def.questions.map((question) =>
            Math.max(
              question.options.findIndex((option) => option.reportId === target),
              0,
            ),
          )
          expect(scoreTest(def, answers).reportId).toBe(target)
        }
      } else if (def.scoring.type === 'band') {
        // 每个 band 报告都要能被某组均匀答案命中
        const reachable = new Set<string>()
        for (let pick = 0; pick < optionCount; pick += 1) {
          reachable.add(scoreTest(def, def.questions.map(() => pick)).reportId)
        }
        for (const band of def.scoring.bands) {
          expect(reachable.has(band.reportId)).toBe(true)
        }
      } else if (def.scoring.type === 'dimension') {
        // 维度模式：首字母极全投与次字母极全投都要命中合法报告
        const first = scoreTest(def, def.questions.map(() => 0))
        const second = scoreTest(def, def.questions.map(() => 1))
        expect(def.reports[first.reportId]).toBeTruthy()
        expect(def.reports[second.reportId]).toBeTruthy()
      } else if (def.scoring.type === 'factor') {
        // 因素模式：reportByFactor 的键是因素 id、值是报告 id。
        // 把每题「该因素权重最高」的选项拉满作答，必须命中对应的报告
        for (const [factorId, targetReport] of Object.entries(def.scoring.reportByFactor)) {
          const answers = def.questions.map((question) => {
            let best = 0
            let bestScore = -1
            question.options.forEach((option, optionIndex) => {
              const score = option.factorWeights?.[factorId] ?? -1
              if (score > bestScore) {
                bestScore = score
                best = optionIndex
              }
            })
            return best
          })
          expect(scoreTest(def, answers).reportId).toBe(targetReport)
        }
      }
    },
  )

  it.each(definitions.map((def) => [def.id, def] as const))(
    '%s copy stays brand-clean and non-clinical',
    (_id, def) => {
      const serialized = JSON.stringify(def)
      for (const word of FORBIDDEN_WORDS) {
        expect(serialized).not.toContain(word)
      }
      for (const hint of CLINICAL_HINTS) {
        expect(serialized).not.toMatch(hint)
      }
    },
  )
})
