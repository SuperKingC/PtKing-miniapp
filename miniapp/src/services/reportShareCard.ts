/**
 * 报告分享卡片：把测试结果画进 5:4 画布（600×480）并导出临时图，作为转发卡片的 imageUrl。
 * 绘制走页面隐藏 canvas（type=2d）；固定用品牌浅色设计——在会话消息里深浅主题下观感一致。
 * 任一步失败返回空串，转发回退微信默认截图，绝不阻断分享。
 * 2026-09-15 重绘：三段式排版（品牌行/主结果区/底部信息行）+ 按分类色板换底 + 纯 canvas 软陶
 * 装饰（噪点纸纹、甜甜圈环、内凹四角星、扇贝条）；chips 用 --shadow-card 三层法的 canvas 等价
 * 实现（实色接触带 + 紧贴软影 + 本体）；tagline 按宽换行不再 18 字中截，结果标题最多两行。
 */
import { formatTestedCount } from './testDiscovery'
import { APP_DISPLAY_NAME, APP_TAGLINE } from './brand'
import { getWxGlobal } from './wxGlobal'

export interface ShareCardData {
  testTitle: string
  resultTitle: string
  tagline: string
  hook?: string
  category?: string
  /** 身份标签（报告 labels）：主结果区软陶胶囊 chips 传播钩子 */
  labels?: string[]
  /** 编辑人气基线：底部右下角「X万+人测过」角标 */
  testedCount?: number
}

/** 分类胶囊底色（与报告页 hero 分类色一致） */
const CATEGORY_MARK: Record<string, { fill: string; chip: string }> = {
  人格: { fill: 'rgba(236, 231, 255, 0.28)', chip: '#ece7ff' },
  情感: { fill: 'rgba(255, 232, 236, 0.32)', chip: '#ffe8ec' },
  职场: { fill: 'rgba(226, 238, 255, 0.32)', chip: '#e2eeff' },
  趣味: { fill: 'rgba(255, 241, 220, 0.34)', chip: '#fff1dc' },
}

/** 分类色板：三段渐变（上深下浅、中间 stop 提亮）+ deep（白 chip 上的字色），取色贴 reference-ui 色板 */
interface SharePalette {
  bgTop: string
  bgMid: string
  bgBottom: string
  deep: string
}

const CATEGORY_PALETTE: Record<string, SharePalette> = {
  人格: { bgTop: '#c05f35', bgMid: '#d67a48', bgBottom: '#eda878', deep: '#8a3d1c' },
  情感: { bgTop: '#c96a5e', bgMid: '#e08a70', bgBottom: '#f5b897', deep: '#8f3f34' },
  职场: { bgTop: '#5e7fa0', bgMid: '#7d9fbd', bgBottom: '#aac6da', deep: '#35506b' },
  趣味: { bgTop: '#bd8c33', bgMid: '#d9ad57', bgBottom: '#f2d18e', deep: '#7f5c1a' },
}

export function shareCardMarkColor(category?: string): { fill: string; chip: string } {
  return CATEGORY_MARK[category ?? ''] ?? CATEGORY_MARK.人格
}

export function shareCardPalette(category?: string): SharePalette {
  return CATEGORY_PALETTE[category ?? ''] ?? CATEGORY_PALETTE.人格
}

export const SHARE_CARD_WIDTH = 600
export const SHARE_CARD_HEIGHT = 480

/** 纯函数核心（可单测）：超长文案截断并加省略号 */
export function clampText(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text
}

const TITLE_SPLIT_PUNCT = /[，。、！？；：,.!?~～\s]/

export interface FittedTitle {
  size: number
  lines: string[]
}

/**
 * 纯函数核心（可单测）：结果标题自适应——单行优先（字号下探到 40 仍放不下才转两行），
 * 两行按标点/空格就近均衡切分，仍放不下按宽度截断加省略号。
 */
export function fitTitleLines(text: string, maxWidth: number, max = 58, twoLineMax = 44, min = 30): FittedTitle {
  let size = max
  while (size > min && text.length * size > maxWidth) size -= 2
  if (size >= 40 && text.length * size <= maxWidth) return { size, lines: [text] }

  size = twoLineMax
  while (size > min && Math.ceil(text.length / 2) * size > maxWidth) size -= 2
  const perLine = Math.max(1, Math.floor(maxWidth / size))
  const mid = Math.floor(text.length / 2)
  // 优先就近切在标点/空格：标点归上一行行尾（避免行首标点）
  let split = mid
  for (let offset = 0; offset <= 2; offset += 1) {
    if (TITLE_SPLIT_PUNCT.test(text[mid - offset] ?? '')) {
      split = mid - offset + 1
      break
    }
    if (TITLE_SPLIT_PUNCT.test(text[mid + offset] ?? '')) {
      split = mid + offset + 1
      break
    }
  }
  split = Math.min(Math.max(split, 1), text.length - 1)
  let first = text.slice(0, split)
  let second = text.slice(split)
  if (first.length > perLine) first = `${first.slice(0, perLine - 1)}…`
  if (second.length > perLine) second = `${second.slice(0, perLine - 1)}…`
  return { size, lines: [first, second] }
}

/**
 * 纯函数核心（可单测）：按宽度逐字换行，最多 maxLines 行；
 * 超出行数上限时末行以省略号收尾（宽度不够则逐字回退再补省略号）。
 */
export function wrapText(
  ctx: Pick<CanvasRenderingContext2D, 'measureText'>,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = []
  let current = ''
  let index = 0
  for (; index < text.length; index += 1) {
    const char = text[index]
    if (current && ctx.measureText(current + char).width > maxWidth) {
      if (lines.length + 1 >= maxLines) break
      lines.push(current)
      current = char
    } else {
      current += char
    }
  }
  if (index < text.length) {
    while (current && ctx.measureText(`${current}…`).width > maxWidth) current = current.slice(0, -1)
    lines.push(`${current}…`)
  } else if (current) {
    lines.push(current)
  }
  return lines
}

export interface LabelChip {
  text: string
  width: number
  /** 距标签行起点的 x 偏移 */
  offset: number
}

/**
 * 纯函数核心（可单测）：身份标签 → 一行软陶胶囊布局（宽度按字数估算，与中文字宽≈字号一致）；
 * 单个标签超 10 字截断，放不下的整枚丢弃。
 */
export function layoutLabelChips(labels?: string[], maxWidth = 460, fontSize = 22, padX = 17, gap = 14, maxChips = 3): LabelChip[] {
  if (!labels || labels.length === 0) return []
  const chips: LabelChip[] = []
  let x = 0
  for (const raw of labels) {
    let text = raw.replace(/^#/, '')
    if (text.length > 10) text = `${text.slice(0, 9)}…`
    let width = text.length * fontSize + padX * 2
    while (width > maxWidth && text.length > 1) {
      text = text.slice(0, -1)
      width = text.length * fontSize + padX * 2
    }
    if (chips.length > 0 && x + width > maxWidth) break
    chips.push({ text, width, offset: x })
    x += width + gap
    if (chips.length >= maxChips) break
  }
  return chips
}

/** 圆角矩形路径（r=高一半即胶囊） */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/** 软陶胶囊：--shadow-card 三层法 canvas 版——无模糊实色接触带 + 紧贴软影 + 本体 */
function drawClayChip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, band = 'rgba(66, 42, 24, 0.16)'): void {
  roundRectPath(ctx, x, y + 3, w, h, h / 2)
  ctx.fillStyle = band
  ctx.fill()
  ctx.save()
  ctx.shadowColor = 'rgba(66, 42, 24, 0.14)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 4
  ctx.fillStyle = fill
  roundRectPath(ctx, x, y, w, h, h / 2)
  ctx.fill()
  ctx.restore()
}

/** 确定性伪随机（噪点纹理每次绘制一致，截图/测试可复现） */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 细噪点：亮暗双色小点阵模拟软陶纸纹微粒 */
function drawNoise(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const rand = mulberry32(42)
  for (let i = 0; i < 460; i += 1) {
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.03 + rand() * 0.035).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(rand() * width, rand() * height, 0.8 + rand() * 1.4, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 150; i += 1) {
    ctx.fillStyle = `rgba(66, 42, 24, ${(0.02 + rand() * 0.02).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(rand() * width, rand() * height, 0.8 + rand() * 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** 软陶甜甜圈环：出血右上，外缘上高光 + 内孔下缘暗影做出体积 */
function drawDonut(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, hole: number): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.beginPath()
  ctx.arc(cx, cy, outer, 0, Math.PI * 2)
  ctx.arc(cx, cy, hole, 0, Math.PI * 2, true)
  ctx.fill()
  ctx.strokeStyle = 'rgba(66, 42, 24, 0.06)'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(cx, cy, hole + 4, Math.PI * 0.15, Math.PI * 0.85)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.arc(cx, cy, outer - 6, Math.PI * 1.15, Math.PI * 1.85)
  ctx.stroke()
}

/** 内凹四角星贴纸（quadratic 控制点收在圆心） */
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha: number): void {
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.quadraticCurveTo(cx, cy, cx + r, cy)
  ctx.quadraticCurveTo(cx, cy, cx, cy + r)
  ctx.quadraticCurveTo(cx, cy, cx - r, cy)
  ctx.quadraticCurveTo(cx, cy, cx, cy - r)
  ctx.closePath()
  ctx.fill()
}

/** 扇贝软陶条：左下角出血一排上凸半圆 */
function drawScallop(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const r = 18
  const y = height + 6
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)'
  ctx.beginPath()
  ctx.moveTo(-8, y)
  for (let x = -8; x < Math.min(width * 0.34, 190); x += r * 2) {
    ctx.arc(x + r, y, r, Math.PI, 0, false)
  }
  ctx.lineTo(Math.min(width * 0.34, 190), y + 24)
  ctx.lineTo(-8, y + 24)
  ctx.closePath()
  ctx.fill()
}

export function drawShareCard(ctx: CanvasRenderingContext2D, data: ShareCardData): void {
  const width = SHARE_CARD_WIDTH
  const height = SHARE_CARD_HEIGHT
  const palette = shareCardPalette(data.category)
  const mark = shareCardMarkColor(data.category)
  const left = 48

  // 底：分类色板三段渐变（中间 stop 提亮，高调浅光）
  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, palette.bgTop)
  bg.addColorStop(0.52, palette.bgMid)
  bg.addColorStop(1, palette.bgBottom)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  drawNoise(ctx, width, height)
  drawDonut(ctx, width - 4, 176, 108, 46)
  drawStar(ctx, width - 108, 316, 12, 0.32)
  drawStar(ctx, width - 64, 362, 9, 0.24)
  drawStar(ctx, width - 130, 396, 7, 0.2)
  drawScallop(ctx, width, height)

  // —— 品牌行：白底品牌胶囊 + slogan，右上分类色胶囊 ——
  const brandFont = '600 24px sans-serif'
  ctx.font = brandFont
  const brandW = ctx.measureText(APP_DISPLAY_NAME).width + 34
  drawClayChip(ctx, left, 44, brandW, 44, 'rgba(255, 255, 255, 0.95)')
  ctx.fillStyle = palette.deep
  ctx.fillText(APP_DISPLAY_NAME, left + 17, 74)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.font = '400 20px sans-serif'
  ctx.fillText(clampText(APP_TAGLINE, 14), left + brandW + 16, 73)

  if (data.category) {
    ctx.font = '600 20px sans-serif'
    const categoryText = clampText(data.category, 4)
    const categoryW = ctx.measureText(categoryText).width + 30
    drawClayChip(ctx, width - 48 - categoryW, 46, categoryW, 40, mark.chip, 'rgba(66, 42, 24, 0.12)')
    ctx.fillStyle = 'rgba(74, 52, 40, 0.85)'
    ctx.fillText(categoryText, width - 48 - categoryW + 15, 73)
  }

  // —— 主结果区：测试名 → 结果大标题（最多两行）→ tagline（按宽换行最多两行）→ 标签胶囊 ——
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)'
  ctx.font = '400 24px sans-serif'
  ctx.fillText(clampText(data.testTitle, 18), left, 144)

  const fit = fitTitleLines(clampText(data.resultTitle, 16), 432)
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${fit.size}px sans-serif`
  let y = 172 + fit.size * 0.88
  for (const line of fit.lines) {
    ctx.fillText(line, left, y)
    y += fit.size * 1.16
  }
  y += 20

  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
  ctx.font = '400 24px sans-serif'
  if (data.tagline) {
    for (const line of wrapText(ctx, data.tagline, 460, 2)) {
      ctx.fillText(line, left, y)
      y += 31
    }
  }
  y += 16

  const hasTested = Boolean(data.testedCount && data.testedCount > 0)

  // 标签胶囊行：chipsFit 保证底边 ≤ 人气胶囊顶（height-62），无需再水平避让
  const chips = layoutLabelChips(data.labels, 460)
  const chipsFit = chips.length > 0 && y + 38 <= height - 66
  if (chipsFit) {
    for (const chip of chips) {
      drawClayChip(ctx, left + chip.offset, y, chip.width, 38, 'rgba(255, 255, 255, 0.95)')
      ctx.fillStyle = palette.deep
      ctx.font = '500 22px sans-serif'
      ctx.fillText(chip.text, left + chip.offset + 17, y + 26)
    }
    y += 38
  }

  // —— 底部信息行：左引导句（标签行挤满时让位）+ 右人气胶囊 ——
  if (data.hook && y + 24 <= height - 24) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.font = '400 20px sans-serif'
    ctx.fillText(clampText(data.hook, 20), left, height - 26)
  }

  if (hasTested) {
    ctx.font = '600 20px sans-serif'
    const pillText = `${formatTestedCount(data.testedCount)}人测过`
    const pillW = ctx.measureText(pillText).width + 32
    drawClayChip(ctx, width - 48 - pillW, height - 62, pillW, 36, 'rgba(255, 255, 255, 0.95)')
    ctx.fillStyle = palette.deep
    ctx.fillText(pillText, width - 48 - pillW + 16, height - 39)
  }
}

interface CanvasNode {
  width: number
  height: number
  getContext: (type: '2d') => CanvasRenderingContext2D
}

/** 在页面隐藏 canvas 上绘制并导出临时文件路径；失败（含 node/vitest）返回空串 */
export function renderShareCard(canvasId: string, data: ShareCardData): Promise<string> {
  return new Promise((resolve) => {
    try {
      const wxLike = getWxGlobal()
      if (!wxLike?.createSelectorQuery || !wxLike?.canvasToTempFilePath) {
        resolve('')
        return
      }
      wxLike
        .createSelectorQuery()
        .select(`#${canvasId}`)
        .fields({ node: true, size: true })
        .exec((result) => {
          try {
            const node = result?.[0]?.node as CanvasNode | undefined
            if (!node) {
              resolve('')
              return
            }
            node.width = SHARE_CARD_WIDTH
            node.height = SHARE_CARD_HEIGHT
            const ctx = node.getContext('2d')
            drawShareCard(ctx, data)
            wxLike.canvasToTempFilePath?.({
              canvas: node,
              success: (res: { tempFilePath?: string }) => resolve(res?.tempFilePath ?? ''),
              fail: () => resolve(''),
            })
          } catch {
            resolve('')
          }
        })
    } catch {
      resolve('')
    }
  })
}
