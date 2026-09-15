import type { TestDefinition } from '../domain/testEngine'
import { MBTI_TEST } from '../domain/tests/mbtiTest'
import { LOVE_PERSONA_TEST } from '../domain/tests/lovePersonaTest'
import { GIFT_TEST } from '../domain/tests/giftTest'
import { OVERTHINK_TEST } from '../domain/tests/overthinkTest'
import { SLEEP_TEST } from '../domain/tests/sleepTest'
import { SOCIAL_TEST } from '../domain/tests/socialStyleTest'
import { ATTACHMENT_TEST } from '../domain/tests/attachmentStyleTest'
import { SINGLE_TEST } from '../domain/tests/singlePowerTest'
import { WORK_ROLE_TEST } from '../domain/tests/workRoleTest'
import { BURNOUT_TEST } from '../domain/tests/burnoutTest'
import { EQ_TEST } from '../domain/tests/eqTest'
import { MIND_AGE_TEST } from '../domain/tests/mindAgeTest'
import { PHONE_TEST } from '../domain/tests/phoneTest'
import { BIGFIVE_TEST } from '../domain/tests/bigFiveTest'
import { DARK_TRIAD_TEST } from '../domain/tests/darkTriadTest'
import { PET_PERSONA_TEST } from '../domain/tests/petPersonaTest'
import { GOOFY_TEST } from '../domain/tests/goofyTest'
import { XP_TEST } from '../domain/tests/xpTest'
import { REPRESSION_TEST } from '../domain/tests/repressionTest'
import { UNHINGED_TEST } from '../domain/tests/unhingedTest'
import { SARCASTIC_TEST } from '../domain/tests/sarcasticTest'
import { LOSER_TEST } from '../domain/tests/loserTalentTest'
import { LOVE_BRAIN_TEST } from '../domain/tests/loveBrainTest'
import { LOVE_TALK_TEST } from '../domain/tests/loveTalkTest'
import { BREAKUP_TEST } from '../domain/tests/breakupTest'
import { CRUSH_TEST } from '../domain/tests/crushTest'
import { OFFICE_ROLE_TEST } from '../domain/tests/officeRoleTest'
import { BOSS_STYLE_TEST } from '../domain/tests/bossStyleTest'
import { CHIIKAWA_BOND_TEST } from '../domain/tests/chiikawaBondTest'
import { SOFT_HEART_TEST } from '../domain/tests/softHeartTest'

/**
 * 测试注册表：静态内置定义兜底 + COS JSON 动态下发合并（M2）。
 * 上架新测试：优先在 COS {根}/tests/registry-vN.json 里追加（免发版热更）；
 * 动态加载失败或结构不合法时，静态定义保证产品完全可用。
 * mergeTestDefinitions 为纯函数（可单测）：动态定义按 id 覆盖静态同名项，其余追加。
 */
import { mergeTestDefinitions } from './testRegistryMerge'

const BASE_DEFINITIONS: Record<string, TestDefinition> = {
  [MBTI_TEST.id]: MBTI_TEST,
  [LOVE_PERSONA_TEST.id]: LOVE_PERSONA_TEST,
  [GIFT_TEST.id]: GIFT_TEST,
  [OVERTHINK_TEST.id]: OVERTHINK_TEST,
  [SLEEP_TEST.id]: SLEEP_TEST,
  [SOCIAL_TEST.id]: SOCIAL_TEST,
  [ATTACHMENT_TEST.id]: ATTACHMENT_TEST,
  [SINGLE_TEST.id]: SINGLE_TEST,
  [WORK_ROLE_TEST.id]: WORK_ROLE_TEST,
  [BURNOUT_TEST.id]: BURNOUT_TEST,
  [EQ_TEST.id]: EQ_TEST,
  [MIND_AGE_TEST.id]: MIND_AGE_TEST,
  [PHONE_TEST.id]: PHONE_TEST,
  [BIGFIVE_TEST.id]: BIGFIVE_TEST,
  [DARK_TRIAD_TEST.id]: DARK_TRIAD_TEST,
  [PET_PERSONA_TEST.id]: PET_PERSONA_TEST,
  [GOOFY_TEST.id]: GOOFY_TEST,
  [XP_TEST.id]: XP_TEST,
  [REPRESSION_TEST.id]: REPRESSION_TEST,
  [UNHINGED_TEST.id]: UNHINGED_TEST,
  [SARCASTIC_TEST.id]: SARCASTIC_TEST,
  [LOSER_TEST.id]: LOSER_TEST,
  [LOVE_BRAIN_TEST.id]: LOVE_BRAIN_TEST,
  [LOVE_TALK_TEST.id]: LOVE_TALK_TEST,
  [BREAKUP_TEST.id]: BREAKUP_TEST,
  [CRUSH_TEST.id]: CRUSH_TEST,
  [OFFICE_ROLE_TEST.id]: OFFICE_ROLE_TEST,
  [BOSS_STYLE_TEST.id]: BOSS_STYLE_TEST,
  [CHIIKAWA_BOND_TEST.id]: CHIIKAWA_BOND_TEST,
  [SOFT_HEART_TEST.id]: SOFT_HEART_TEST,
}

/**
 * 运营位编辑数据（2026-09-15 配置）：热门榜权重 / 上新日期 / 人气基线，调榜单只改这里。
 * 人气为编辑配置的固定数字（暂无统计后台），随 registry 导出同步 COS。
 */
const EDITORIAL_META: Record<string, Pick<TestDefinition, 'hotRank' | 'addedAt' | 'testedCount'>> = {
  mbti: { hotRank: 3, testedCount: 286000 },
  'love-persona': { testedCount: 168000 },
  'chiikawa-bond': { hotRank: 1, addedAt: '2026-09-12', testedCount: 152000 },
  'soft-heart': { hotRank: 2, addedAt: '2026-09-15', testedCount: 88000 },
  'love-brain': { hotRank: 4, testedCount: 126000 },
  overthink: { testedCount: 96000 },
  'xp-test': { testedCount: 92000 },
  'unhinged-test': { hotRank: 5, testedCount: 88000 },
  'mind-age': { testedCount: 84000 },
  'dark-triad': { testedCount: 76000 },
  'pet-persona': { testedCount: 72000 },
  eq: { testedCount: 68000 },
  'sarcastic-test': { testedCount: 66000 },
  'attachment-style': { testedCount: 64000 },
  'breakup-style': { testedCount: 58000 },
  bigfive: { testedCount: 56000 },
  'crush-signal': { testedCount: 52000 },
  goofy: { testedCount: 48000 },
  'phone-addiction': { testedCount: 46000 },
  'loser-talent': { testedCount: 44000 },
  burnout: { testedCount: 42000 },
  'single-power': { testedCount: 38000 },
  'love-talk': { testedCount: 36000 },
  'repression-test': { testedCount: 34000 },
  'social-style': { testedCount: 30000 },
  sleep: { testedCount: 26000 },
  'work-role': { testedCount: 22000 },
  'office-role': { testedCount: 19000 },
  gift: { testedCount: 16000 },
  'boss-style': { testedCount: 13000 },
}

/** 静态目录 = 基础定义叠加运营位编辑数据（同 id 缺编辑项时原样保留） */
const STATIC_DEFINITIONS: Record<string, TestDefinition> = Object.fromEntries(
  Object.entries(BASE_DEFINITIONS).map(([id, definition]) => [
    id,
    { ...definition, ...EDITORIAL_META[id] },
  ]),
)

/** 首页卡片展示顺序：静态顺序为基，动态新增的测试排在其后 */
const STATIC_ORDER: readonly string[] = [
  MBTI_TEST.id,
  XP_TEST.id,
  UNHINGED_TEST.id,
  BIGFIVE_TEST.id,
  DARK_TRIAD_TEST.id,
  LOVE_PERSONA_TEST.id,
  REPRESSION_TEST.id,
  SARCASTIC_TEST.id,
  LOSER_TEST.id,
  ATTACHMENT_TEST.id,
  SOCIAL_TEST.id,
  SINGLE_TEST.id,
  GIFT_TEST.id,
  WORK_ROLE_TEST.id,
  EQ_TEST.id,
  BURNOUT_TEST.id,
  PET_PERSONA_TEST.id,
  GOOFY_TEST.id,
  OVERTHINK_TEST.id,
  SLEEP_TEST.id,
  MIND_AGE_TEST.id,
  PHONE_TEST.id,
  // 2026-09-04 情感/职场扩批次
  LOVE_BRAIN_TEST.id,
  LOVE_TALK_TEST.id,
  BREAKUP_TEST.id,
  CRUSH_TEST.id,
  // 2026-09-15 吸引力批次：嘴硬心软指数
  SOFT_HEART_TEST.id,
  OFFICE_ROLE_TEST.id,
  BOSS_STYLE_TEST.id,
  // 2026-09-12 趣味扩批次
  CHIIKAWA_BOND_TEST.id,
]

let listOrder: string[] = [...STATIC_ORDER]
let definitions: Record<string, TestDefinition> = { ...STATIC_DEFINITIONS }

const listeners = new Set<() => void>()

export function subscribeTestRegistry(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** COS 动态测试合并入口：每次以静态目录为基重放，远端删除的项会消失。
 *  合并后再叠加一次包内编辑运营位：客户端若拉到未同步的旧 registry（同 id 覆盖
 *  把静态项换成无运营字段的旧数据），热门榜/NEW/人气不至于整体消失。 */
export function applyDynamicTestDefinitions(dynamic: TestDefinition[]): void {
  const merged = mergeTestDefinitions(STATIC_DEFINITIONS, STATIC_ORDER, dynamic)
  definitions = definitionsRecordReplaced(merged, EDITORIAL_META)
  listOrder = merged.order
  listeners.forEach((listener) => listener())
}

/** 合并结果再叠加包内编辑运营位（hotRank/addedAt/testedCount 以 EDITORIAL_META 为准） */
function definitionsRecordReplaced(
  merged: { definitions: Record<string, TestDefinition>; order: string[] },
  editorial: Record<string, Pick<TestDefinition, 'hotRank' | 'addedAt' | 'testedCount'>>,
): Record<string, TestDefinition> {
  const out: Record<string, TestDefinition> = {}
  for (const [id, definition] of Object.entries(merged.definitions)) {
    out[id] = editorial[id] ? { ...definition, ...editorial[id] } : definition
  }
  return out
}

export const TEST_LIST_ORDER: readonly string[] = STATIC_ORDER

export function getTestDefinition(testId: string): TestDefinition | null {
  return definitions[testId] ?? null
}

export function listTestDefinitions(): TestDefinition[] {
  return listOrder.map((id) => definitions[id]).filter((def): def is TestDefinition => Boolean(def))
}
