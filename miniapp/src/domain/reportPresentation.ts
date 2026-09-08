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
