import { describe, expect, it } from 'vitest'
import { getTarotStageCopy } from './tarotSkinCopy'

describe('tarot stage copy per skin', () => {
  it('keeps classic wording identical to the original literal copy', () => {
    const copy = getTarotStageCopy('classic')
    expect(copy.questionTitle).toBe('先写下你真正想知道的事')
    expect(copy.spreadTitle).toBe('选择适合问题的牌阵')
    expect(copy.shuffleTitle).toBe('长按牌堆洗牌，让心意融进牌里')
    expect(copy.shuffleHint(37.4)).toBe('37% · 松手可暂停，再次长按继续')
    expect(copy.cutTitle).toBe('凭直觉切一下牌')
    expect(copy.cutHint(0)).toBe('点击牌堆，每次完成一次切牌')
    expect(copy.cutHint(2)).toBe('已切 2 次，还可以继续切牌')
    expect(copy.fanTitle(3)).toBe('心中默念问题，选出 3 张牌')
    expect(copy.fanHint(2, 3)).toBe('已选 2/3')
    expect(copy.revealTitle(true)).toBe('牌已全部翻开')
    expect(copy.revealTitle(false)).toBe('逐张点开，翻开你的牌')
  })

  it('speaks in the cat voice for the clay skin without banned words', () => {
    const copy = getTarotStageCopy('clay')
    expect(copy.questionTitle).not.toBe(getTarotStageCopy('classic').questionTitle)
    expect(copy.shuffleHint(50)).toContain('50%')
    expect(copy.fanTitle(3)).toContain('3 张牌')
    // 猫一律称「测测子」，不再用「猫咪」泛称(过审约束)
    expect(copy.revealTitle(false)).toContain('测测子')
    for (const value of [copy.questionTitle, copy.spreadTitle, copy.shuffleTitle, copy.cutTitle, copy.fanTitle(3), copy.revealTitle(false)]) {
      expect(value).not.toMatch(/占卜|算命|改运/)
      expect(value).not.toContain('猫咪')
    }
  })
})
