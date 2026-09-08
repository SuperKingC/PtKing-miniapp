import { describe, expect, it } from 'vitest'
import { getPlayProgress, getTestPlayStage, pickDailyCategory } from './experience'

describe('答题进度与今日入口', () => {
  it('剩余题数按未答题计算，含当前题，回退不增加', () => {
    expect(getPlayProgress(0, 20)).toEqual({ remaining: 20, percent: 0 })
    expect(getPlayProgress(19, 20)).toEqual({ remaining: 1, percent: 95 })
    expect(getPlayProgress(20, 20)).toEqual({ remaining: 0, percent: 100 })
    expect(getPlayProgress(30, 20)).toEqual({ remaining: 0, percent: 100 })
    expect(getPlayProgress(0, 0)).toEqual({ remaining: 0, percent: 0 })
  })
  it('已过半不再说快过半，首题和最后三题口径准确', () => {
    expect(getTestPlayStage(0, 20)).toBe('按最近的通常状态选择')
    expect(getTestPlayStage(10, 20)).toBe('已经过半，继续按自己的感受选')
    expect(getTestPlayStage(17, 20)).toBe('最后几题，不必追求标准答案')
    expect(getTestPlayStage(20, 20)).toBe('回答已齐，可以生成报告')
  })
  it('每日结果稳定，四个方向均能轮到，跨月正常轮换', () => {
    const categories = Array.from({ length: 4 }, (_, i) => pickDailyCategory(2026, 9, 7 + i))
    expect(new Set(categories).size).toBe(4)
    expect(pickDailyCategory(2026, 9, 7)).toBe(pickDailyCategory(2026, 9, 7))
    expect(pickDailyCategory(2026, 9, 30)).not.toBe(pickDailyCategory(2026, 10, 1))
  })
})
