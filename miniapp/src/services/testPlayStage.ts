export function getTestPlayStage(questionIndex: number, total: number): string {
  if (total <= 1 || questionIndex >= total - 3) return '最后几题，保持直觉'
  if (questionIndex >= Math.floor(total / 2)) return '快过半了，继续按第一反应选'
  return '刚开始，跟着第一反应选'
}
