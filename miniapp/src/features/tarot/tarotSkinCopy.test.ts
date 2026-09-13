import { describe, expect, it } from 'vitest'
import { getTarotStageCopy } from './tarotSkinCopy'

describe('tarot stage copy per skin', () => {
  it('keeps classic wording identical to the original literal copy', () => {
    const copy = getTarotStageCopy('classic')
    expect(copy.questionTitle).toBe('先写下你真正想知道的事')
    expect(copy.spreadTitle).toBe('选择适合问题的牌阵')
    expect(copy.shuffleTitle(0)).toBe('长按牌堆洗牌，让心意融进牌里')
    expect(copy.shuffleHint(37.4)).toBe('37% · 松手可暂停，再次长按继续')
    expect(copy.cutTitle(0)).toBe('凭直觉切一下牌')
    expect(copy.cutHint(0)).toBe('点击牌堆，每次完成一次切牌')
    expect(copy.cutHint(2)).toBe('已切 2 次，还可以继续切牌')
    expect(copy.fanTitle(3, 0)).toBe('心中默念问题，选出 3 张牌')
    expect(copy.fanHint(2, 3)).toBe('已选 2/3')
    expect(copy.revealTitle(true)).toBe('牌已全部翻开')
    expect(copy.revealTitle(false)).toBe('逐张点开，翻开你的牌')
    // classic 标题不吃入参：纯字符串阶段名，状态另起一行
    expect(copy.shuffleTitle(88)).toBe(copy.shuffleTitle(0))
    expect(copy.cutTitle(3)).toBe(copy.cutTitle(0))
  })

  it('speaks one line of cat voice in the clay bubble, state folded into the sentence', () => {
    const copy = getTarotStageCopy('clay')
    expect(copy.questionTitle).not.toBe(getTarotStageCopy('classic').questionTitle)
    // 实时状态并进同一句话（猫的口吻），不再是底部第二行状态提示
    expect(copy.shuffleTitle(40)).toContain('40%')
    expect(copy.cutTitle(2)).toContain('2 次')
    expect(copy.fanTitle(3, 2)).toContain('2 张')
    expect(copy.fanTitle(3, 2)).toContain('还差 1 张')
    // 是测测子在说话（第一人称），不是「点击牌堆」这类操作提示
    expect(copy.cutTitle(0)).toContain('我')
    expect(copy.fanTitle(3, 0)).toContain('我')
    expect(copy.revealTitle(false)).toContain('我')
    expect(copy.cutTitle(0)).not.toContain('点击')
    expect(copy.revealTitle(false)).not.toContain('逐张点开')
    // clay 不再单独渲染状态行
    for (const hint of [copy.shuffleHint(40), copy.cutHint(2), copy.fanHint(2, 3)]) {
      expect(hint).toBe('')
    }
    // 猫一律称「测测子」，不再用「猫咪」泛称(过审约束)
    for (const value of [
      copy.questionTitle,
      copy.spreadTitle,
      copy.shuffleTitle(0),
      copy.shuffleTitle(40),
      copy.cutTitle(0),
      copy.cutTitle(2),
      copy.fanTitle(3, 0),
      copy.fanTitle(3, 2),
      copy.revealTitle(false),
    ]) {
      expect(value).not.toMatch(/占卜|算命|改运/)
      expect(value).not.toContain('猫咪')
    }
  })
})
