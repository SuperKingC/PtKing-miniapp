import type { TestDefinition } from '../domain/testEngine'
import { MBTI_TEST } from '../domain/tests/mbtiTest'
import { LOVE_PERSONA_TEST } from '../domain/tests/lovePersonaTest'
import { GIFT_TEST } from '../domain/tests/giftTest'
import { OVERTHINK_TEST } from '../domain/tests/overthinkTest'
import { SLEEP_TEST } from '../domain/tests/sleepTest'

/**
 * 测试注册表：静态内置定义兜底 + COS JSON 动态下发合并（M2）。
 * 上架新测试：优先在 COS {根}/tests/registry-vN.json 里追加（免发版热更）；
 * 动态加载失败或结构不合法时，静态定义保证产品完全可用。
 * mergeTestDefinitions 为纯函数（可单测）：动态定义按 id 覆盖静态同名项，其余追加。
 */
import { mergeTestDefinitions } from './testRegistryMerge'

const STATIC_DEFINITIONS: Record<string, TestDefinition> = {
  [MBTI_TEST.id]: MBTI_TEST,
  [LOVE_PERSONA_TEST.id]: LOVE_PERSONA_TEST,
  [GIFT_TEST.id]: GIFT_TEST,
  [OVERTHINK_TEST.id]: OVERTHINK_TEST,
  [SLEEP_TEST.id]: SLEEP_TEST,
}

/** 首页卡片展示顺序：静态顺序为基，动态新增的测试排在其后 */
let listOrder: string[] = [
  MBTI_TEST.id,
  LOVE_PERSONA_TEST.id,
  GIFT_TEST.id,
  OVERTHINK_TEST.id,
  SLEEP_TEST.id,
]

let definitions: Record<string, TestDefinition> = { ...STATIC_DEFINITIONS }

/** COS 动态测试合并入口：加载成功后调用，页面下次渲染即见新测试 */
export function applyDynamicTestDefinitions(dynamic: TestDefinition[]): void {
  const merged = mergeTestDefinitions(definitions, listOrder, dynamic)
  definitions = merged.definitions
  listOrder = merged.order
}

export const TEST_LIST_ORDER: readonly string[] = listOrder

export function getTestDefinition(testId: string): TestDefinition | null {
  return definitions[testId] ?? null
}

export function listTestDefinitions(): TestDefinition[] {
  return listOrder.map((id) => definitions[id]).filter((def): def is TestDefinition => Boolean(def))
}
