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
}

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
  return { reportId, dimensionScores, bandScore: null }
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
  return { reportId: band.reportId, dimensionScores: [], bandScore: total }
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
  return { reportId, dimensionScores: [], bandScore: null }
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
    default:
      invalidDefinition(def.id, 'scoring_type')
  }
}

/** 结果展示标题：优先报告 title，缺定义时退 reportId（防御渲染层崩溃） */
export function resolveReportTitle(def: TestDefinition, reportId: string): string {
  return def.reports[reportId]?.title ?? reportId
}
