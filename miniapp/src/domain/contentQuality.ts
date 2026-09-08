import type { TestDefinition } from './testEngine'

/** 用户可见结论句禁止下定论；题目选项里的角色对白不在此列。 */
const ABSOLUTE_CLAIMS = [/你就是(?!你)/, /你一定会/, /你本质上/, /你缺乏/]
const DOUBLE_NEGATIVE = /不是不|不会不|不能不/
const FORTUNE = /占卜|算命|改运/
const CLINICAL = /诊断|抑郁症|精神疾病|确诊|病理|用药建议|治疗你的|放弃治疗|给你的处方|筛查/

function hasPattern(text: string, pattern: RegExp): boolean {
  return new RegExp(pattern.source).test(text)
}

export function collectCopyIssues(definition: TestDefinition): string[] {
  const issues: string[] = []
  const questionTexts = definition.questions.map((question) => question.text)
  if (new Set(questionTexts).size !== questionTexts.length) issues.push('题目题干重复')

  definition.questions.forEach((question, index) => {
    const marks = (question.text.replace(/「[^」]*」/g, '').match(/？/g) ?? []).length
    if (marks > 1) issues.push(`第${index + 1}题含多个问号`)
    if (hasPattern(question.text, DOUBLE_NEGATIVE)) issues.push(`第${index + 1}题含双重否定`)
    if (question.options.length < 2) issues.push(`第${index + 1}题选项不足`)
    const optionTexts = question.options.map((option) => option.text)
    if (new Set(optionTexts).size !== optionTexts.length) issues.push(`第${index + 1}题选项重复`)
  })

  const surfaces = [
    definition.title,
    definition.notice,
    ...definition.intro,
    ...Object.values(definition.reports).flatMap((report) => [
      report.title,
      report.tagline,
      report.summary,
      ...report.detail,
      report.deep ?? '',
      ...(report.strengths ?? []),
      ...(report.blindSpots ?? []),
      ...(report.actions ?? []),
      ...(report.scenes ?? []).map((item) => item.text),
    ]),
  ]

  surfaces.forEach((text) => {
    if (!text) return
    ABSOLUTE_CLAIMS.forEach((pattern) => {
      if (hasPattern(text, pattern)) issues.push(`结论句过于绝对：${text.slice(0, 24)}`)
    })
    if (hasPattern(text, FORTUNE) || hasPattern(text, CLINICAL)) {
      issues.push(`含禁止措辞：${text.slice(0, 24)}`)
    }
  })

  if (!/趣味|娱乐|自我观察|自我觉察/.test(definition.notice)) {
    issues.push('声明未标明趣味或自我观察')
  }
  return [...new Set(issues)]
}
