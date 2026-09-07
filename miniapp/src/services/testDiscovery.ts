import type { TestDefinition } from '../domain/testEngine'

/**
 * 首页推荐：优先同分类未测过的测试，再用注册表原顺序补齐。
 * 纯函数，便于单测；页面只负责把近期记录 id 传进来。
 */
export function pickRecommendedTests(
  definitions: TestDefinition[],
  recentTestIds: string[],
  skipId?: string,
  count = 4,
): TestDefinition[] {
  const completed = new Set(recentTestIds)
  const categoryWeight = new Map<string, number>()
  recentTestIds.forEach((id, index) => {
    const definition = definitions.find((item) => item.id === id)
    if (!definition) return
    categoryWeight.set(
      definition.category,
      (categoryWeight.get(definition.category) ?? 0) + (recentTestIds.length - index),
    )
  })

  return [...definitions]
    .filter((item) => item.id !== skipId)
    .sort((left, right) => {
      const leftScore =
        (categoryWeight.get(left.category) ?? 0) * 10 + (completed.has(left.id) ? 0 : 40)
      const rightScore =
        (categoryWeight.get(right.category) ?? 0) * 10 + (completed.has(right.id) ? 0 : 40)
      return rightScore - leftScore
    })
    .slice(0, count)
}
