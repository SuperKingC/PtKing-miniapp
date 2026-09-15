export interface ReportPresentationInput {
  score?: number | null
  top: string
  second?: string | null
  previous?: string | null
}

export function buildReportPresentation(input: ReportPresentationInput) {
  return {
    scoreNote: '图表中的分数是本次测试的归一化得分，不是人群百分位，也不代表好坏。',
    typeNote: input.second && input.second !== input.top
      ? `主要接近「${input.top}」，同时也有「${input.second}」的倾向；并列或接近不等于固定类型。`
      : `当前结果更接近「${input.top}」，它描述的是当下回答呈现的倾向。`,
    retestNote: input.previous ? '复测时请把它当作一次中性自我观察，按最近状态和第一反应作答，不必追求与上次一致。' : '下次复测时，按最近状态和第一反应作答即可，不必追求与本次一致。',
  }
}

const QUOTE_MAX_CHARS = 60

/** 取第一句：逐字符按 。！？ 切分（不用正则环顾，兼容旧 JS 引擎的包体解析） */
function firstSentence(text: string): string {
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '。' || char === '！' || char === '？') return text.slice(0, index + 1)
  }
  return text
}

/**
 * 报告首屏金句：优先编辑配置 quote；缺省从深度解读 deep 取第一句（60 字封顶加省略号）。
 * 两者皆缺返回空串，页面不渲染金句卡（旧记录/简版报告零破坏）。
 */
export function resolveReportQuote(report: { quote?: string; deep?: string }): string {
  const explicit = report.quote?.trim()
  if (explicit) return explicit
  const derived = report.deep ? firstSentence(report.deep).trim() : ''
  if (!derived) return ''
  return derived.length <= QUOTE_MAX_CHARS ? derived : `${derived.slice(0, QUOTE_MAX_CHARS - 1)}…`
}
