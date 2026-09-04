/**
 * 通用测试引擎（M1）：一套 TestDefinition 驱动全部心理测试，三种计分模式——
 * dimension 维度二分（MBTI 型：各维度多数票定字母，拼出 reportId）、
 * band 总分区间（量表型：权重求和落区间）、archetype 类型投票（最高票人格）。
 * 纯函数、确定性，不碰 HTTP/存储/React（架构边界）。题目与报告文案 M2 起迁 COS JSON 热更。
 */

export interface TestMeta {
  minutes: number
  resultLabel: string
}

export interface TestReport {
  id: string
  title: string
  tagline: string
  summary: string
  detail: string[]
}

export interface TestOption {
  text: string
  /** dimension 模式：该选项投向的极性（0=第一字母极，1=第二字母极）；缺省按选项序推导 */
  side?: 0 | 1
  /** band 模式：该选项累加的分数；缺省按选项序 +1 */
  weight?: number
  /** archetype 模式：该选项投票给的人格报告 id */
  reportId?: string
  /** factor 模式：该选项为各因素累加的分数（缺省键不计） */
  factorWeights?: Record<string, number>
}

export interface TestQuestion {
  text: string
  /** dimension 模式：该题所属维度 id */
  dim?: string
  options: TestOption[]
}

export type TestScoring =
  | {
      type: 'dimension'
      dims: Array<{ id: string; letters: [string, string]; labels: [string, string] }>
    }
  | { type: 'band'; max: number; bands: Array<{ min: number; max: number; reportId: string }> }
  | { type: 'archetype'; reports: string[] }
  | {
      type: 'factor'
      /** 因素定义：id/名称；报告按主导因素（含反向因素取反后）映射 */
      factors: Array<{ id: string; label: string; /** 反向计分因素：取 100-百分位 */ reverse?: boolean }>
      /** 主导因素 → 报告 id 映射（并列时按本数组顺序取先） */
      reportByFactor: Record<string, string>
    }

export interface TestDefinition {
  id: string
  title: string
  category: '人格' | '情感' | '职场' | '趣味'
  meta: TestMeta
  intro: string[]
  notice: string
  questions: TestQuestion[]
  scoring: TestScoring
  reports: Record<string, TestReport>
}

export interface DimensionScore {
  id: string
  /** 展示用标签，如 "E 外向 ↔ I 内向" */
  label: string
  /** 第一字母极的得票占比（0-100） */
  percent: number
}

export interface TestResult {
  reportId: string
  dimensionScores: DimensionScore[]
  bandScore: number | null
  /** factor 模式：各因素百分位（0-100，反向因素已取反），非 factor 模式为空 */
  factorScores: Array<{ id: string; label: string; percent: number }>
  /**
   * archetype 模式：全部类型按 scoring.reports 定义顺序的票数（含 0 票），供报告页画分布图；
   * 非 archetype 模式为空。字段可选：引擎升级前落库的旧记录没有它，读侧必须 ?? [] 兜底。
   */
  archetypeVotes?: Array<{ reportId: string; count: number }>
}

/** 上架测试最少题数基准：题太少用户会觉得「不准」（2026-09 产品基准，静态 sanity 与 COS 内容共同遵守） */
export const MIN_QUESTIONS = 12

function invalidDefinition(testId: string, reason: string): never {
  throw new Error(`invalid_test_definition:${testId}:${reason}`)
}

function scoreDimension(def: TestDefinition, answers: number[]): TestResult {
  const scoring = def.scoring as Extract<TestScoring, { type: 'dimension' }>
  const tally = new Map<string, { side0: number; total: number }>()
  for (const dim of scoring.dims) tally.set(dim.id, { side0: 0, total: 0 })

  def.questions.forEach((question, qIndex) => {
    if (!question.dim || !tally.has(question.dim)) {
      invalidDefinition(def.id, `question_${qIndex}_dim`)
    }
    const chosen = question.options[answers[qIndex]]
    // 二分题必须恰好两个选项：序 0 投第一极、序 1 投第二极（显式 side 可覆盖）
    const side = chosen.side ?? (answers[qIndex] === 0 ? 0 : 1)
    const cell = tally.get(question.dim)!
    cell.total += 1
    if (side === 0) cell.side0 += 1
  })

  const letters: string[] = []
  const dimensionScores: DimensionScore[] = []
  for (const dim of scoring.dims) {
    const cell = tally.get(dim.id)!
    if (cell.total === 0) invalidDefinition(def.id, `dim_${dim.id}_unpolled`)
    // 多数票定字母（同票取第一字母极，定义侧确定性兜底）
    letters.push(cell.side0 * 2 >= cell.total ? dim.letters[0] : dim.letters[1])
    dimensionScores.push({
      id: dim.id,
      label: `${dim.labels[0]} ↔ ${dim.labels[1]}`,
      percent: Math.round((cell.side0 / cell.total) * 100),
    })
  }

  const reportId = letters.join('')
  if (!def.reports[reportId]) invalidDefinition(def.id, `missing_report_${reportId}`)
  return { reportId, dimensionScores, bandScore: null, factorScores: [], archetypeVotes: [] }
}

function scoreBand(def: TestDefinition, answers: number[]): TestResult {
  const scoring = def.scoring as Extract<TestScoring, { type: 'band' }>
  let total = 0
  def.questions.forEach((question, qIndex) => {
    const chosen = question.options[answers[qIndex]]
    total += chosen.weight ?? answers[qIndex] + 1
  })
  if (total > scoring.max) invalidDefinition(def.id, `band_total_${total}`)
  const band = scoring.bands.find((b) => total >= b.min && total <= b.max)
  if (!band) invalidDefinition(def.id, `band_gap_${total}`)
  if (!def.reports[band.reportId]) invalidDefinition(def.id, `missing_report_${band.reportId}`)
  return { reportId: band.reportId, dimensionScores: [], bandScore: total, factorScores: [], archetypeVotes: [] }
}

function scoreFactor(def: TestDefinition, answers: number[]): TestResult {
  const scoring = def.scoring as Extract<TestScoring, { type: 'factor' }>
  const sums = new Map<string, number>()
  const counts = new Map<string, number>()
  for (const factor of scoring.factors) {
    sums.set(factor.id, 0)
    counts.set(factor.id, 0)
  }

  def.questions.forEach((question, qIndex) => {
    const chosen = question.options[answers[qIndex]]
    const weights = chosen.factorWeights
    if (!weights || Object.keys(weights).length === 0) {
      invalidDefinition(def.id, `question_${qIndex}_weights`)
    }
    for (const [factorId, value] of Object.entries(weights!)) {
      if (!sums.has(factorId)) invalidDefinition(def.id, `unknown_factor_${factorId}`)
      sums.set(factorId, sums.get(factorId)! + value)
      counts.set(factorId, counts.get(factorId)! + 1)
    }
  })

  const factorScores: Array<{ id: string; label: string; percent: number }> = []
  for (const factor of scoring.factors) {
    const sum = sums.get(factor.id)!
    const count = counts.get(factor.id)!
    if (count === 0) invalidDefinition(def.id, `factor_${factor.id}_unpolled`)
    // 单因素满分 = 该因素被计分的题数 × 每题最大权重（权重上限按 4 计，与大五/暗黑量表的四点计分一致）
    const maxWeight = Math.max(
      4,
      ...def.questions.flatMap((q) => Object.values(q.options.flatMap((o) => Object.values(o.factorWeights ?? {})))),
    )
    const rawPercent = Math.round((sum / (count * maxWeight)) * 100)
    const percent = factor.reverse ? 100 - rawPercent : rawPercent
    factorScores.push({ id: factor.id, label: factor.label, percent })
  }

  // 主导因素 = 百分位最高者（反向已取反）；并列按 factors 定义顺序取先（确定性）
  let dominant = scoring.factors[0]
  for (const factor of scoring.factors) {
    const current = factorScores.find((f) => f.id === factor.id)!
    const best = factorScores.find((f) => f.id === dominant.id)!
    if (current.percent > best.percent) dominant = factor
  }
  const reportId = scoring.reportByFactor[dominant.id]
  if (!reportId || !def.reports[reportId]) invalidDefinition(def.id, `missing_report_${dominant.id}`)

  return { reportId, dimensionScores: [], bandScore: null, factorScores, archetypeVotes: [] }
}

function scoreArchetype(def: TestDefinition, answers: number[]): TestResult {
  const scoring = def.scoring as Extract<TestScoring, { type: 'archetype' }>
  const counts = new Map<string, number>()
  def.questions.forEach((question, qIndex) => {
    const chosen = question.options[answers[qIndex]]
    const reportId = chosen.reportId
    if (!reportId || !scoring.reports.includes(reportId)) {
      invalidDefinition(def.id, `question_${qIndex}_report`)
    }
    counts.set(reportId, (counts.get(reportId) ?? 0) + 1)
  })
  // 最高票获胜；同票按 scoring.reports 定义顺序取先者（确定性）
  let reportId = ''
  let best = -1
  for (const id of scoring.reports) {
    const count = counts.get(id) ?? 0
    if (count > best) {
      best = count
      reportId = id
    }
  }
  if (best <= 0) invalidDefinition(def.id, 'archetype_no_votes')
  if (!def.reports[reportId]) invalidDefinition(def.id, `missing_report_${reportId}`)
  // 票数分布按 scoring.reports 定义顺序输出（含 0 票），供报告页画「人格倾向分布」
  const archetypeVotes = scoring.reports.map((id) => ({ reportId: id, count: counts.get(id) ?? 0 }))
  return { reportId, dimensionScores: [], bandScore: null, factorScores: [], archetypeVotes }
}

/**
 * 计分入口。answers 为每题选中的选项下标数组，长度必须等于题数且下标合法。
 * 结果 reportId 必须能命中 definition.reports，否则视为定义缺陷直接抛错（不静默兜底）。
 */
export function scoreTest(def: TestDefinition, answers: number[]): TestResult {
  if (answers.length !== def.questions.length) {
    throw new Error(`invalid_test_answers:${def.id}:length_${answers.length}`)
  }
  answers.forEach((answer, qIndex) => {
    const optionCount = def.questions[qIndex].options.length
    if (!Number.isInteger(answer) || answer < 0 || answer >= optionCount) {
      throw new Error(`invalid_test_answers:${def.id}:q${qIndex}`)
    }
  })

  switch (def.scoring.type) {
    case 'dimension':
      return scoreDimension(def, answers)
    case 'band':
      return scoreBand(def, answers)
    case 'archetype':
      return scoreArchetype(def, answers)
    case 'factor':
      return scoreFactor(def, answers)
    default:
      invalidDefinition(def.id, 'scoring_type')
  }
}

/** 结果展示标题：优先报告 title，缺定义时退 reportId（防御渲染层崩溃） */
export function resolveReportTitle(def: TestDefinition, reportId: string): string {
  return def.reports[reportId]?.title ?? reportId
}

/** band 模式展示辅助：分数落在第几档（从 0 数）；未命中返回 null。供报告页高亮区间刻度 */
export function findBandIndex(def: TestDefinition, score: number): number | null {
  if (def.scoring.type !== 'band') return null
  const index = def.scoring.bands.findIndex((band) => score >= band.min && score <= band.max)
  return index === -1 ? null : index
}

/**
 * 雷达图几何纯函数（factor 模式报告页 canvas 用）：返回各顶点画布坐标（0-1 归一化，y 向下）。
 * 顶点顺序与 factors 一致、从正上方开始顺时针；axes 为空时返回空数组。
 */
export function radarChartGeometry(axisCount: number, radius = 0.38, center = 0.5): Array<{ x: number; y: number }> {
  if (axisCount <= 0) return []
  if (axisCount < 3) {
    // 退化情形（0-2 个因素不构成多边形）：横排等距点，避免除零与重叠
    return Array.from({ length: axisCount }, (_, index) => ({ x: (index + 1) / (axisCount + 1), y: center }))
  }
  return Array.from({ length: axisCount }, (_, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / axisCount
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) }
  })
}
