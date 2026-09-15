import { describe, expect, it } from 'vitest'
import {
  drawShareCard,
  fitTitleLines,
  layoutLabelChips,
  wrapText,
  type ShareCardData,
} from './reportShareCard'

function createMockContext() {
  const texts: string[] = []
  const state = { font: '24px sans-serif' }
  const ctx: Record<string, unknown> = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetY: 0,
    createLinearGradient: () => ({ addColorStop() {} }),
    measureText(text: string) {
      const size = Number(/(\d+)px/.exec(state.font)?.[1] ?? 24)
      return { width: text.length * size }
    },
    fillRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    arc() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    fillText(text: string) {
      texts.push(text)
    },
  }
  Object.defineProperty(ctx, 'font', {
    get: () => state.font,
    set: (value: string) => {
      state.font = value
    },
  })
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts }
}

describe('分享卡片绘制', () => {
  it('不再画娱乐向声明，保留分类引导句，不画分数', () => {
    const data: ShareCardData = {
      testTitle: 'MBTI 人格测试',
      resultTitle: '建筑师',
      tagline: '这是一次自我观察',
      hook: '这是一次自我观察，不是定论',
      category: '人格',
    }
    const { ctx, texts } = createMockContext()
    drawShareCard(ctx, data)
    const joined = texts.join(' ')
    expect(joined).toContain('不是定论')
    expect(joined).toContain('人格')
    expect(joined).not.toContain('娱乐向')
    expect(joined).not.toContain('不是诊断')
    expect(texts.some((text) => /\d+分/.test(text))).toBe(false)
  })

  it('身份标签画成胶囊文案，人气角标保留万+格式', () => {
    const data: ShareCardData = {
      testTitle: '嘴硬心软指数',
      resultTitle: '冰壳暖核型',
      tagline: '嘴上是拒绝，身体很诚实',
      hook: '要不要看看你是哪一型',
      category: '情感',
      labels: ['嘴硬心软', '刀子嘴豆腐心认证'],
      testedCount: 152000,
    }
    const { ctx, texts } = createMockContext()
    drawShareCard(ctx, data)
    const joined = texts.join(' ')
    expect(joined).toContain('嘴硬心软')
    expect(joined).toContain('刀子嘴豆腐心认证')
    expect(joined).toContain('15万+人测过')
  })

  it('无标签无人气时零破坏（不画 # 前缀与人数角标）', () => {
    const data: ShareCardData = {
      testTitle: 'MBTI 人格测试',
      resultTitle: '建筑师',
      tagline: '这是一次自我观察',
      hook: '这是一次自我观察，不是定论',
      category: '人格',
    }
    const { ctx, texts } = createMockContext()
    drawShareCard(ctx, data)
    expect(texts.join(' ')).not.toContain('#')
    expect(texts.join(' ')).not.toContain('人测过')
  })

  it('长 tagline 按宽换行两行，不再 18 字中截断句', () => {
    const data: ShareCardData = {
      testTitle: '情商段位鉴定',
      resultTitle: '待升级系统',
      tagline: '不是不会说话，是还没意识到话的重量，给自己留一个台阶',
      category: '职场',
    }
    const { ctx, texts } = createMockContext()
    drawShareCard(ctx, data)
    // 25 字全量可读：第一行 + 第二行合计包含整句文字（不含中截省略号）
    const taglineTexts = texts.filter((text) => text.includes('不是不会说话') || text.includes('台阶'))
    expect(taglineTexts.join('')).not.toContain('…')
    expect(texts.join(' ')).not.toContain('话的重…')
  })
})

describe('fitTitleLines', () => {
  it('短标题单行用最大字号', () => {
    expect(fitTitleLines('建筑师', 432)).toEqual({ size: 58, lines: ['建筑师'] })
    expect(fitTitleLines('待升级系统', 432)).toEqual({ size: 58, lines: ['待升级系统'] })
  })

  it('8 字标题单行缩字号放得下', () => {
    const fit = fitTitleLines('已有八字的标题哦', 432)
    expect(fit.lines).toHaveLength(1)
    expect(fit.size).toBeGreaterThanOrEqual(40)
  })

  it('超长标题转两行均衡切分，标点归上一行行尾', () => {
    const fit = fitTitleLines('不说话的话是的直接选择', 432)
    expect(fit.lines).toHaveLength(2)
    for (const line of fit.lines) {
      expect(line.length).toBeLessThanOrEqual(11)
    }
    const punct = fitTitleLines('话的重量，还没意识到的', 432)
    expect(punct.lines).toEqual(['话的重量，', '还没意识到的'])
  })

  it('极端超长按宽度截断加省略号', () => {
    const fit = fitTitleLines('一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十', 432)
    expect(fit.size).toBe(30)
    expect(fit.lines.some((line) => line.endsWith('…'))).toBe(true)
  })
})

describe('wrapText', () => {
  function fakeCtx(charWidth: number) {
    let font = 24
    return {
      get font() {
        return font
      },
      set font(value: string) {
        const size = Number(/(\d+)px/.exec(value)?.[1] ?? 24)
        font = size
      },
      measureText(text: string) {
        return { width: text.length * charWidth * (font / 24) }
      },
    }
  }

  it('放得下不换行', () => {
    expect(wrapText(fakeCtx(10), '一二三', 30, 2)).toEqual(['一二三'])
  })

  it('按宽度换行且超上限时末行省略号收尾', () => {
    expect(wrapText(fakeCtx(10), '一二三', 30, 2)).toEqual(['一二三'])
    expect(wrapText(fakeCtx(10), '一二三四五六七', 30, 2)).toEqual(['一二三', '四五…'])
    expect(wrapText(fakeCtx(10), '一二三四', 30, 1)).toEqual(['一二…'])
  })
})

describe('layoutLabelChips', () => {
  it('多枚标签排一行，放下即收', () => {
    const chips = layoutLabelChips(['嘴硬心软', '刀子嘴豆腐心认证'], 400)
    expect(chips).toHaveLength(2)
    expect(chips[0].text).toBe('嘴硬心软')
    expect(chips[1].text).toBe('刀子嘴豆腐心认证')
    expect(chips[1].offset).toBe(chips[0].width + 14)
  })

  it('单枚超 10 字截断，放不下的整枚丢弃', () => {
    const chips = layoutLabelChips(['超过十个字的身份标签会被截断处理', '第二枚'], 400)
    expect(chips[0].text.endsWith('…')).toBe(true)
    expect(chips[0].text).toHaveLength(10)
    expect(chips).toHaveLength(2)
    // 第二枚起放不进剩余 400 宽 → 整枚丢弃
    const dropped = layoutLabelChips(['aaaaaaaaaa', 'bbbbbbbbbb', 'cccccccccc'], 400)
    expect(dropped).toHaveLength(1)
  })

  it('无标签返回空数组', () => {
    expect(layoutLabelChips(undefined)).toEqual([])
    expect(layoutLabelChips([])).toEqual([])
  })
})
