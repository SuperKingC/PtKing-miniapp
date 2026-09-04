/**
 * 报告分享卡片：把测试结果画进 5:4 画布（600×480）并导出临时图，作为转发卡片的 imageUrl。
 * 绘制走页面隐藏 canvas（type=2d）；固定用品牌浅色设计——在会话消息里深浅主题下观感一致。
 * 任一步失败返回空串，转发回退微信默认截图，绝不阻断分享。
 */
import { getWxGlobal } from './wxGlobal'

export interface ShareCardData {
  testTitle: string
  resultTitle: string
  tagline: string
}

export const SHARE_CARD_WIDTH = 600
export const SHARE_CARD_HEIGHT = 480

/** 纯函数核心（可单测）：超长文案截断并加省略号 */
export function clampText(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text
}

/** 纯函数核心（可单测）：结果标题可用字号（中文字符宽≈字号，放不下就逐级缩小到下限） */
export function fitTitleFontSize(text: string, maxWidth: number, max = 60, min = 30): number {
  let size = max
  while (size > min && text.length * size > maxWidth) size -= 2
  return size
}

export function drawShareCard(ctx: CanvasRenderingContext2D, data: ShareCardData): void {
  const width = SHARE_CARD_WIDTH
  const height = SHARE_CARD_HEIGHT

  // 底：品牌暖陶土橘渐变（与报告 hero 卡同语言）
  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, '#c05f35')
  bg.addColorStop(1, '#e89a6f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // 装饰同心圆
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)'
  ctx.beginPath()
  ctx.arc(width - 70, 60, 110, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)'
  ctx.beginPath()
  ctx.arc(40, height - 30, 90, 0, Math.PI * 2)
  ctx.fill()

  // 品牌行
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.font = '500 26px sans-serif'
  ctx.fillText('PtKing · 测测你的隐藏人格', 48, 72)

  // 测试名
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
  ctx.font = '400 24px sans-serif'
  ctx.fillText(clampText(data.testTitle, 20), 48, 150)

  // 结果大标题：先截断再按字数自适应缩小
  const displayTitle = clampText(data.resultTitle, 12)
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${fitTitleFontSize(displayTitle, width - 96)}px sans-serif`
  ctx.fillText(displayTitle, 48, 262)

  // tagline
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
  ctx.font = '400 26px sans-serif'
  ctx.fillText(clampText(data.tagline, 18), 48, 330)

  // 底部引导
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)'
  ctx.font = '400 26px sans-serif'
  ctx.fillText('来看看你的人格里藏着什么 →', 48, height - 64)
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
