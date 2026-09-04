import { describe, expect, it } from 'vitest'
import { scoreTest, type TestDefinition } from '../domain/testEngine'
import { listTestDefinitions } from '../services/testRegistry'

/**
 * 计分一致性契约：报告必须真的由「每题的回答」决定，而不是装饰。
 * - archetype：独立按选项 reportId 数票重算多数派，与引擎结果逐组比对（同票按 scoring.reports 序）。
 * - band：选项权重单调不降（severity ladder）+ 独立求和落档，与引擎 bandScore/reportId 比对。
 * - factor：独立按 factorWeights 求各因素总分、取 reportByFactor 映射，与引擎结果比对。
 * - 变异性：随机作答 40 组必须产生 ≥2 种不同报告（否则报告与回答无关，是摆设）。
 * - 确定性：同一组回答重复计分结果完全一致。
 */

const RANDOM_ROUNDS = 40
const SEED = 20260904
/** 可复现伪随机（mulberry32）：测试不依赖 Math.random 的执行顺序 */
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomAnswers(def: TestDefinition, rng: () => number): number[] {
  return def.questions.map((question) => Math.floor(rng() * question.options.length))
}

/** 独立重算 archetype 多数派（同票按 scoring.reports 定义序取先，对齐引擎规则） */
function expectedArchetypeReport(def: TestDefinition, answers: number[]): string {
  const scoring = def.scoring as Extract<TestDefinition['scoring'], { type: 'archetype' }>
  const counts = new Map<string, number>()
  answers.forEach((answer, qIndex) => {
    const reportId = def.questions[qIndex].options[answer].reportId
    counts.set(reportId, (counts.get(reportId) ?? 0) + 1)
  })
  let best = -1
  let winner = ''
  for (const id of scoring.reports) {
    const count = counts.get(id) ?? 0
    if (count > best) {
      best = count
      winner = id
    }
  }
  return winner
}

/** 独立重算 band：权重求和（缺显式 weight 时引擎用下标+1，这里对齐同规则）→ 落档 → 报告 */
function expectedBandResult(def: TestDefinition, answers: number[]): { reportId: string; bandScore: number } {
  const scoring = def.scoring as Extract<TestDefinition['scoring'], { type: 'band' }>
  const total = def.questions.reduce(
    (sum, question, qIndex) => sum + (question.options[answers[qIndex]].weight ?? answers[qIndex] + 1),
    0,
  )
  const band = scoring.bands.find((b) => total >= b.min && total <= b.max)!
  return { reportId: band.reportId, bandScore: total }
}

/** 独立重算 factor：按 reportByFactor 汇总各因素权重，最高因素即报告 */
function expectedFactorReport(def: TestDefinition, answers: number[]): string {
  const scoring = def.scoring as Extract<TestScoringShape, { type: 'factor' }>
  const sums = new Map<string, number>()
  def.questions.forEach((question, qIndex) => {
    const weights = question.options[answers[qIndex]].factorWeights ?? {}
    for (const [factorId, weight] of Object.entries(weights)) {
      sums.set(factorId, (sums.get(factorId) ?? 0) + (typeof weight === 'number' ? weight : 0))
    }
  })
  let best = -Infinity
  let winner = ''
  for (const [factorId, targetReport] of Object.entries(scoring.reportByFactor)) {
    const sum = sums.get(factorId) ?? 0
    if (sum > best) {
      best = sum
      winner = targetReport
    }
  }
  return winner
}

type TestScoringShape = TestDefinition['scoring']

describe('scoring consistency: the report is truly driven by the answers', () => {
  const definitions = listTestDefinitions()

  it.each(definitions.map((def) => [def.id, def] as const))(
    '%s: 40 random answer sets reproduce the engine result by independent recomputation',
    (_id, def) => {
      const rng = makeRng(SEED)
      for (let round = 0; round < RANDOM_ROUNDS; round += 1) {
        const answers = randomAnswers(def, rng)
        const result = scoreTest(def, answers)
        switch (def.scoring.type) {
          case 'archetype': {
            const expected = expectedArchetypeReport(def, answers)
            expect(result.reportId).toBe(expected)
            break
          }
          case 'band': {
            const expected = expectedBandResult(def, answers)
            expect(result.bandScore).toBe(expected.bandScore)
            expect(result.reportId).toBe(expected.reportId)
            break
          }
          case 'factor': {
            expect(result.reportId).toBe(expectedFactorReport(def, answers))
            break
          }
          case 'dimension': {
            // 引擎内部按维度字母票数：这里验证结构契约（dimensionScores 存在且百分位在 0-100）
            for (const dim of result.dimensionScores) {
              expect(dim.percent).toBeGreaterThanOrEqual(0)
              expect(dim.percent).toBeLessThanOrEqual(100)
            }
            break
          }
        }
      }
    },
  )

  it.each(definitions.map((def) => [def.id, def] as const))(
    '%s: uniform answer sweep (all-A/B/C/D) produces at least 2 distinct reports',
    (_id, def) => {
      // 均匀扫描是"报告随回答变化"的下界证明：选项阶梯的每一极拉满必须能换到不同报告。
      // （随机作答对 band 量表会统计性集中在中段，不能作为变异性判据）
      const distinct = new Set<string>()
      const optionCount = def.questions[0].options.length
      for (let pick = 0; pick < optionCount; pick += 1) {
        distinct.add(scoreTest(def, def.questions.map(() => pick)).reportId)
      }
      expect(distinct.size).toBeGreaterThanOrEqual(2)
    },
  )

  it('archetype tests: random voting shifts the winner (votes genuinely matter)', () => {
    const rng = makeRng(SEED + 3)
    for (const def of definitions) {
      if (def.scoring.type !== 'archetype') continue
      const distinct = new Set<string>()
      for (let round = 0; round < RANDOM_ROUNDS; round += 1) {
        distinct.add(scoreTest(def, randomAnswers(def, rng)).reportId)
      }
      expect(distinct.size).toBeGreaterThanOrEqual(2)
    }
  })

  it.each(definitions.map((def) => [def.id, def] as const))(
    '%s: identical answers always yield an identical result (determinism)',
    (_id, def) => {
      const rng = makeRng(SEED + 2)
      const answers = randomAnswers(def, rng)
      const first = scoreTest(def, answers)
      const second = scoreTest(def, answers)
      expect(second).toEqual(first)
    },
  )

  it('band questions ascend in weight (severity ladder matches option order)', () => {
    for (const def of definitions) {
      if (def.scoring.type !== 'band') continue
      def.questions.forEach((question, qIndex) => {
        const weights = question.options.map((option) => option.weight ?? 0)
        for (let i = 1; i < weights.length; i += 1) {
          expect(weights[i]).toBeGreaterThanOrEqual(weights[i - 1])
        }
        // 权重必须真的有区分度（全等阶梯会让报告与选项文案无关）
        expect(new Set(weights).size).toBeGreaterThan(1)
      })
    }
  })

  it('band tests declare explicit weights on every option (no silent index fallback)', () => {
    // 引擎对缺 weight 的选项用「下标+1」兜底：这会让档位依赖选项排序的隐含约定，
    // 任何人重排选项就会悄悄改变报告口径——因此要求 band 测试全部显式声明。
    for (const def of definitions) {
      if (def.scoring.type !== 'band') continue
      def.questions.forEach((question, qIndex) => {
        question.options.forEach((option, oIndex) => {
          expect(typeof option.weight, `${def.id} q${qIndex} option ${oIndex}`).toBe('number')
        })
      })
    }
  })
})
