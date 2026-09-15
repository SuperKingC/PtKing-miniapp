import { describe, expect, it } from 'vitest'
import { shareCardDisclaimer } from '../domain/shareCopy'
import { drawShareCard, formatShareLabels, type ShareCardData } from './reportShareCard'

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
      category: '人格',
    }
    const { ctx, texts } = createMockContext()
    drawShareCard(ctx, data)
    expect(texts.join(' ')).toContain('不是诊断')
    expect(texts.join(' ')).toContain('不是定论')
    expect(texts.join(' ')).toContain('人格')
    expect(texts.some((text) => /\d+分/.test(text))).toBe(false)
  })

  it('draws identity labels and tested-count badge when provided', () => {
    const data: ShareCardData = {
      testTitle: '嘴硬心软指数',
      resultTitle: '冰壳暖核型',
      tagline: '嘴上是拒绝，身体很诚实',
      hook: '要不要看看你是哪一型',
      disclaimer: shareCardDisclaimer(),
      category: '情感',
      labels: ['嘴硬心软', '刀子嘴豆腐心认证'],
      testedCount: 152000,
    }
    const { ctx, texts } = createMockContext()
    drawShareCard(ctx, data)
    const joined = texts.join(' ')
    expect(joined).toContain('#嘴硬心软 #刀子嘴豆腐心认证')
    expect(joined).toContain('15万+人测过')
  })

  it('omits labels and tested count when absent (old data zero-breakage)', () => {
    const data: ShareCardData = {
      testTitle: 'MBTI 人格测试',
      resultTitle: '建筑师',
      tagline: '这是一次自我观察',
      hook: '这是一次自我观察，不是定论',
      disclaimer: shareCardDisclaimer(),
      category: '人格',
    }
    const { ctx, texts } = createMockContext()
    drawShareCard(ctx, data)
    expect(texts.join(' ')).not.toContain('#')
    expect(texts.join(' ')).not.toContain('人测过')
  })
})

describe('formatShareLabels', () => {
  it('joins labels with # prefix, strips stray hashes and clamps long lines', () => {
    expect(formatShareLabels(undefined)).toBe('')
    expect(formatShareLabels([])).toBe('')
    expect(formatShareLabels(['嘴硬心软', '#刀子嘴豆腐心认证'])).toBe('#嘴硬心软 #刀子嘴豆腐心认证')
    const long = formatShareLabels(['aaaaaaaaaa', 'bbbbbbbbbb', 'cccccccccc'])
    expect(long).toBe('#aaaaaaaaaa #bbbbbbbbbb…')
  })
})
