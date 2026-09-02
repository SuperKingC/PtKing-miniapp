import type { TestDefinition } from '../domain/testEngine'
import { MBTI_TEST } from '../domain/tests/mbtiTest'

/**
 * 测试注册表（M1 本地静态版）：页面与列表全部从这里取定义。
 * M2 起新增测试优先走 COS JSON 动态下发，注册表保留静态兜底；
 * 上架新测试只需在此追加一条（或 COS 加一份 JSON），页面零改动。
 */

const REGISTRY: Record<string, TestDefinition> = {
  [MBTI_TEST.id]: MBTI_TEST,
}

/** 首页卡片展示顺序（id 列表，顺序即产品排序） */
export const TEST_LIST_ORDER: string[] = [MBTI_TEST.id]

export function getTestDefinition(testId: string): TestDefinition | null {
  return REGISTRY[testId] ?? null
}

export function listTestDefinitions(): TestDefinition[] {
  return TEST_LIST_ORDER.map((id) => REGISTRY[id]).filter((def): def is TestDefinition => Boolean(def))
}
