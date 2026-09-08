import type { TestDefinition } from './testEngine'

/** 用已答数量而不是当前浏览题号衡量完成度；回退改答案不会倒退。 */
export function getPlayProgress(answered: number, total: number): { remaining: number; percent: number } {
  if (!Number.isFinite(total) || total <= 0) return { remaining: 0, percent: 0 }
  const count = Math.min(total, Math.max(0, Number.isFinite(answered) ? Math.floor(answered) : 0))
  return { remaining: total - count, percent: Math.round(count / total * 100) }
}

export function getTestPlayStage(answered: number, total: number): string {
  const { remaining } = getPlayProgress(answered, total)
  if (remaining === 0) return '回答已齐，可以生成报告'
  if (remaining <= 3) return '最后几题，不必追求标准答案'
  if (answered >= total / 2) return '已经过半，继续按自己的感受选'
  return '按最近的通常状态选择'
}

/** 日期由平台层传入，纯函数不读取时钟。四类按连续自然日轮换。 */
export function pickDailyCategory(year: number, month: number, day: number): TestDefinition['category'] {
  const categories: TestDefinition['category'][] = ['人格', '情感', '职场', '趣味']
  const ordinal = Math.floor(Date.UTC(year, month - 1, day) / 86400000)
  return categories[((ordinal % categories.length) + categories.length) % categories.length]
}
