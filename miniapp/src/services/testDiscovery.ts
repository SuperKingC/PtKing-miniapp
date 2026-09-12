import type { TestDefinition } from '../domain/testEngine'

/**
 * 首页推荐：按分类轮转取件，保证「每个分类至少一个」——避免整块推荐全是同一类型。
 * 分类顺序按近期热度降序（并列保持注册表原序），分类内未测过优先、其余按原顺序。
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
  const score = (item: TestDefinition) =>
    (categoryWeight.get(item.category) ?? 0) * 10 + (completed.has(item.id) ? 0 : 40)

  const byCategory = new Map<string, TestDefinition[]>()
  for (const item of definitions) {
    if (item.id === skipId) continue
    const list = byCategory.get(item.category) ?? []
    list.push(item)
    byCategory.set(item.category, list)
  }
  const categories = [...byCategory.keys()].sort(
    (left, right) => (categoryWeight.get(right) ?? 0) - (categoryWeight.get(left) ?? 0),
  )
  for (const category of categories) {
    byCategory.set(category, [...byCategory.get(category)!].sort((left, right) => score(right) - score(left)))
  }

  // 轮转：第 n 轮各分类各取第 n 个，同类取完才重复，天然保证多样性
  const picked: TestDefinition[] = []
  for (let round = 0; picked.length < count; round += 1) {
    let advanced = false
    for (const category of categories) {
      const candidate = byCategory.get(category)![round]
      if (!candidate) continue
      picked.push(candidate)
      advanced = true
      if (picked.length >= count) break
    }
    if (!advanced) break
  }
  return picked
}

/** 首页搜索：匹配标题、分类和简介。 */
export function matchTests(definitions: TestDefinition[], keyword: string): TestDefinition[] {
  const needle = keyword.trim().toLowerCase()
  if (!needle) return definitions
  return definitions.filter((item) => {
    const haystack = [item.title, item.category, ...item.intro].join('\n').toLowerCase()
    return haystack.includes(needle)
  })
}
