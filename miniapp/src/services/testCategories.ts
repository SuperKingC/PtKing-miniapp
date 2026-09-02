import type { TestDefinition } from '../domain/testEngine'

export type TestCategoryKey = 'all' | TestDefinition['category']

export interface TestCategoryMeta {
  key: TestCategoryKey
  label: string
}

/** 分类元数据：测试中心筛选 chips 与分区标题共用这一份（顺序即展示顺序） */
export const TEST_CATEGORIES: TestCategoryMeta[] = [
  { key: 'all', label: '全部' },
  { key: '人格', label: '人格' },
  { key: '情感', label: '情感' },
  { key: '职场', label: '职场' },
  { key: '趣味', label: '趣味' },
]

/** 分类过滤纯函数：key 为 'all' 返回原列表，否则按 category 严格匹配 */
export function filterByCategory<T extends { category: TestDefinition['category'] }>(
  items: T[],
  key: TestCategoryKey,
): T[] {
  if (key === 'all') return items
  return items.filter((item) => item.category === key)
}
