import { describe, expect, it } from 'vitest'
import type { TestDefinition } from '../domain/testEngine'
import { applyDynamicTestDefinitions, getTestDefinition } from './testRegistry'

/** 运营位（hotRank/addedAt/testedCount）以包内 EDITORIAL_META 为权威：
 *  客户端拉到未同步的旧 COS registry 时（同 id 覆盖成无运营字段的旧数据），
 *  热门榜/NEW/人气不得整体消失。 */
describe('applyDynamicTestDefinitions keeps editorial meta authoritative', () => {
  it('re-applies package editorial meta after merging stale remote copies', () => {
    const stale = {
      ...getTestDefinition('mbti')!,
      hotRank: undefined,
      testedCount: undefined,
      addedAt: undefined,
      title: '旧标题 MBTI',
    } as TestDefinition

    applyDynamicTestDefinitions([stale])
    const merged = getTestDefinition('mbti')!
    expect(merged.hotRank).toBe(3)
    expect(merged.testedCount).toBe(286000)
    // 标题属于内容文案，仍以 registry 下发为准（本用例的旧标题只用于构造旧数据）
    expect(merged.title).toBe('旧标题 MBTI')

    // 空重放恢复「静态 + 运营位」基线，不污染其它用例
    applyDynamicTestDefinitions([])
    expect(getTestDefinition('mbti')!.title).toBe('MBTI 人格测试')
    expect(getTestDefinition('chiikawa-bond')!.hotRank).toBe(1)
  })
})
