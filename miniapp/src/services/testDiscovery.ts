import type { TestDefinition } from '../domain/testEngine'

/** 新用户（无完成记录）「为你推荐」固定顺序，从上到下。 */
export const NEW_USER_RECOMMEND_IDS = ['mbti', 'love-persona', 'xp-test', 'chiikawa-bond'] as const

/**
 * 首页推荐：无完成记录时按 NEW_USER_RECOMMEND_IDS 固定位；有记录后按分类轮转取件，
 * 保证「每个分类至少一个」——避免整块推荐全是同一类型。
 * 分类顺序按近期热度降序（并列保持注册表原序），分类内未测过优先、其余按原顺序。
 * 纯函数，便于单测；页面只负责把近期记录 id 传进来。
 */
export function pickRecommendedTests(
  definitions: TestDefinition[],
  recentTestIds: string[],
  skipId?: string,
  count = 4,
): TestDefinition[] {
  if (recentTestIds.length === 0) {
    const seeded = pickNewUserDefaults(definitions, skipId, count)
    if (seeded.length >= count) return seeded
    const used = new Set(seeded.map((item) => item.id))
    const rest = pickByCategoryRotation(
      definitions.filter((item) => !used.has(item.id)),
      recentTestIds,
      skipId,
      count - seeded.length,
    )
    return [...seeded, ...rest]
  }
  return pickByCategoryRotation(definitions, recentTestIds, skipId, count)
}

function pickNewUserDefaults(
  definitions: TestDefinition[],
  skipId: string | undefined,
  count: number,
): TestDefinition[] {
  const byId = new Map(definitions.map((item) => [item.id, item]))
  const picked: TestDefinition[] = []
  for (const id of NEW_USER_RECOMMEND_IDS) {
    if (picked.length >= count) break
    if (id === skipId) continue
    const item = byId.get(id)
    if (item) picked.push(item)
  }
  return picked
}

function pickByCategoryRotation(
  definitions: TestDefinition[],
  recentTestIds: string[],
  skipId: string | undefined,
  count: number,
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

/** NEW 角标窗口：addedAt 起该天数内首页卡片显示 NEW（同日计第 0 天） */
export const NEW_BADGE_WINDOW_DAYS = 14

/**
 * 热门榜：有人工编辑 hotRank 的测试按权重升序取前 count 个（并列保持注册表原序）。
 * 榜单数据走编辑配置（无统计后台），没有任何 hotRank 时返回空数组，页面回退「为你推荐」。
 */
export function pickHotTests(definitions: TestDefinition[], count = 4): TestDefinition[] {
  return definitions
    .map((definition, index) => ({ definition, index }))
    .filter((entry) => typeof entry.definition.hotRank === 'number')
    .sort(
      (left, right) =>
        (left.definition.hotRank as number) - (right.definition.hotRank as number) || left.index - right.index,
    )
    .slice(0, count)
    .map((entry) => entry.definition)
}

/** addedAt 起 NEW_BADGE_WINDOW_DAYS 天内算「新上架」；缺日期/格式非法/未来日期一律不算 */
export function isNewTest(definition: TestDefinition, now: Date): boolean {
  if (!definition.addedAt) return false
  const added = new Date(`${definition.addedAt}T00:00:00`)
  if (Number.isNaN(added.getTime())) return false
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((today.getTime() - added.getTime()) / (24 * 60 * 60 * 1000))
  return diffDays >= 0 && diffDays < NEW_BADGE_WINDOW_DAYS
}

/** 人气数字展示：≥1亿 进位「X.Y亿+」，≥1万 进位「X万+」（向下取整），其余原样 */
export function formatTestedCount(count: number): string {
  if (count >= 100000000) return `${(Math.floor(count / 10000000) / 10).toString().replace(/\.0$/, '')}亿+`
  if (count >= 10000) return `${Math.floor(count / 10000)}万+`
  return `${count}`
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
