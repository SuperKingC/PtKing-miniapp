import type { TestDefinition } from '../domain/testEngine'

/**
 * 注册表合并纯函数：动态（COS 下发）定义按 id 覆盖静态同名项，新 id 追加到列表尾。
 * 结构不合法的动态项直接丢弃（与 testEngine 的严格校验口径一致：宁缺毋错）。
 */
export function mergeTestDefinitions(
  staticDefinitions: Record<string, TestDefinition>,
  staticOrder: readonly string[],
  dynamic: TestDefinition[],
): { definitions: Record<string, TestDefinition>; order: string[] } {
  const definitions: Record<string, TestDefinition> = { ...staticDefinitions }
  const order: string[] = [...staticOrder]

  for (const item of dynamic) {
    if (!isValidTestDefinition(item)) continue
    const isNew = !(item.id in definitions)
    definitions[item.id] = item
    if (isNew) order.push(item.id)
  }

  return { definitions, order }
}

/** 最小结构校验（导出供 dynamicTests 复用）：防止 COS 上半残 JSON 打崩页面（计分合法性由 scoreTest 再兜） */
export function isValidTestDefinition(item: unknown): item is TestDefinition {
  if (typeof item !== 'object' || item === null) return false
  const def = item as TestDefinition
  return (
    typeof def.id === 'string' &&
    def.id.length > 0 &&
    typeof def.title === 'string' &&
    Array.isArray(def.questions) &&
    def.questions.length > 0 &&
    typeof def.scoring === 'object' &&
    def.scoring !== null &&
    typeof def.reports === 'object' &&
    def.reports !== null &&
    Object.keys(def.reports).length > 0
  )
}
