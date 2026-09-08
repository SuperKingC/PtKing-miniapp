import { describe, expect, it } from 'vitest'
import { shareCardDisclaimer } from '../domain/shareCopy'
import { drawShareCard, type ShareCardData } from './reportShareCard'

function createMockContext() {
  const texts: string[] = []
  const ctx = {
    fillStyle: '',
    font: '',
    createLinearGradient: () => ({ addColorStop() {} }),
    fillRect() {},
    beginPath() {},
    arc() {},
    fill() {},
    fillText(text: string) {
      texts.push(text)
    },
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts }
}

describe('分享卡片绘制', () => {
  it('按分类写入引导句和娱乐向说明，不画分数', () => {
    const data: ShareCardData = {
      testTitle: 'MBTI 人格测试',
      resultTitle: '建筑师',
      tagline: '这是一次自我观察',
      hook: '这是一次自我观察，不是定论',
      disclaimer: shareCardDisclaimer(),
    }
    const { ctx, texts } = createMockContext()
    drawShareCard(ctx, data)
    expect(texts.join(' ')).toContain('不是诊断')
    expect(texts.join(' ')).toContain('不是定论')
    expect(texts.some((text) => /\d+分/.test(text))).toBe(false)
  })
})
