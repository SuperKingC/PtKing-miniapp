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
    expect(merged.hotRank).toBe(1)
    expect(merged.testedCount).toBe(30000)
    // 标题属于内容文案，仍以 registry 下发为准（本用例的旧标题只用于构造旧数据）
    expect(merged.title).toBe('旧标题 MBTI')

    // 空重放恢复「静态 + 运营位」基线，不污染其它用例
    applyDynamicTestDefinitions([])
    expect(getTestDefinition('mbti')!.title).toBe('MBTI 人格测试')
    expect(getTestDefinition('chiikawa-bond')!.hotRank).toBe(4)
  })

  it('drops stale remote hotRank when package editorial no longer configures it', () => {
    // 旧 COS registry 还带 soft-heart hotRank:2；包内已撤榜——显式赋 undefined 必须压掉旧值，
    // 否则它会顶掉 XP/Chiikawa 闯进热门榜（spread 叠加清不掉已有键的回归）
    const stale = {
      ...getTestDefinition('soft-heart')!,
      hotRank: 2,
    } as TestDefinition
    applyDynamicTestDefinitions([stale])
    expect(getTestDefinition('soft-heart')!.hotRank).toBeUndefined()
    expect(getTestDefinition('soft-heart')!.addedAt).toBe('2026-09-15')
    expect(getTestDefinition('soft-heart')!.testedCount).toBe(16600)

    applyDynamicTestDefinitions([])
  })
})
