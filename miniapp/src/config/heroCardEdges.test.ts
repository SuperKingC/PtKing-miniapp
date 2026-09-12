import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import { miniappRoot } from './testPaths'

/* 今日推荐栏（hero-card）边缘契约。资产来自参考稿直裁（git e5df4de 的
   hero-card-v3.png），随后 v5-v8 一路「修」：v7 按 alpha>=200 二值化把真彩边压成
   1px 台阶（alpha 级数 64→16），v8 再对每列底缘盖固定斜坡 [235,120,36,0]。两处都
   不跟真实轮廓，页面上读作锯齿与硬线。v9 回到直裁源清残框后，用 4x 超采样重建轮廓
   过渡。v9 的残框清理不够彻底：底缘只清 alpha<200、右缘只清 x>=670，漏下的暖灰
   像素（RGB 150-240，非黑）又不在 v9 的 RGB<120 修复范围内，于是面板底/右留了一圈
   不跟圆角的暖灰「方块边」（2026-09-12 用户反馈）。v10 清残框清到底并把暖灰像素
   也换成最近本体色。这里直接解码 PNG 核对剖面与边缘颜色，防止再退回阶跃边或暖灰框。 */

const ASSET = 'src/assets/illus/hero-card-v10.png'

function decode(rel: string) {
  const png = PNG.sync.read(readFileSync(resolve(miniappRoot(), rel)))
  const rgb = new Uint8Array(png.width * png.height * 3)
  const alpha = new Uint8Array(png.width * png.height)
  for (let i = 0; i < png.width * png.height; i += 1) {
    rgb[i * 3] = png.data[i * 4]
    rgb[i * 3 + 1] = png.data[i * 4 + 1]
    rgb[i * 3 + 2] = png.data[i * 4 + 2]
    alpha[i] = png.data[i * 4 + 3]
  }
  return { width: png.width, height: png.height, rgb, alpha }
}

describe('今日推荐栏边缘抗锯齿', () => {
  const img = decode(ASSET)

  it('外轮廓是多级过渡，不是 255→0 的单像素台阶', () => {
    const levels = new Set<number>()
    for (let i = 0; i < img.alpha.length; i += 1) levels.add(img.alpha[i])
    /* v8 二值化后仅 15 级；真彩过渡应有数十级 */
    expect(levels.size, 'alpha 级数').toBeGreaterThan(24)

    /* 每列底界的最后几个像素里，必须存在 1..254 的过渡值（不直接 255 贴 0） */
    let hardCut = 0
    let columns = 0
    for (let x = 0; x < img.width; x += 1) {
      let bottom = -1
      for (let y = img.height - 1; y >= 0; y -= 1) {
        if (img.alpha[y * img.width + x] > 0) { bottom = y; break }
      }
      if (bottom < 0) continue
      columns += 1
      const seg = [3, 2, 1, 0].map((d) => img.alpha[Math.max(0, bottom - d) * img.width + x])
      const hasSolid = seg.includes(255)
      const hasClear = seg.includes(0)
      const hasRamp = seg.some((v) => v > 0 && v < 255)
      if (hasSolid && hasClear && !hasRamp) hardCut += 1
    }
    expect(columns).toBeGreaterThan(600)
    expect(hardCut, '硬跳变列数').toBe(0)
  })

  it('过渡带跨至少 2 个像素（不是 1px 硬边）', () => {
    /* 沿清晰左直边统计每行过渡像素数 */
    const counts: number[] = []
    for (let y = 130; y < 270; y += 1) {
      let n = 0
      for (let x = 0; x < 12; x += 1) {
        const a = img.alpha[y * img.width + x]
        if (a > 0 && a < 255) n += 1
      }
      counts.push(n)
    }
    const withRamp = counts.filter((n) => n > 0)
    expect(withRamp.length, '有过渡的行数').toBeGreaterThan(120)
    const mean = withRamp.reduce((s, v) => s + v, 0) / withRamp.length
    expect(mean, '左缘平均过渡像素数').toBeGreaterThanOrEqual(1.5)
  })

  it('半透明边缘合成为页面底色后不发灰（无黑灰晕边）', () => {
    /* 只看 AA 环（0<alpha<200）的合成亮度：残框清零留下的 RGB(0,0,0) 若被 AA 给回
       alpha，合成后会明显压暗，读作一圈黑灰细边（同 917a570 的 tile 黑晕）。核心区的
       深色内容（猫眼等）不在此列。 */
    const PAGE = [254, 250, 245]
    let dark = 0
    let ringCount = 0
    let minLum = 255
    for (let i = 0; i < img.alpha.length; i += 1) {
      const a = img.alpha[i]
      if (a === 0 || a >= 200) continue
      ringCount += 1
      const w = a / 255
      const lum = (
        (img.rgb[i * 3] * w + PAGE[0] * (1 - w)) +
        (img.rgb[i * 3 + 1] * w + PAGE[1] * (1 - w)) +
        (img.rgb[i * 3 + 2] * w + PAGE[2] * (1 - w))
      ) / 3
      if (lum < minLum) minLum = lum
      if (lum < 215) dark += 1
    }
    expect(ringCount, 'AA 环像素数').toBeGreaterThan(1000)
    expect(minLum, 'AA 环最暗合成亮度').toBeGreaterThan(196)
    expect(dark, '合成为页面底后明显压暗的 AA 环像素').toBeLessThan(300)
  })

  it('面板底/右外圈是面板蓝，不是参考稿带进的暖灰方块边', () => {
    /* v9 的残框清理漏下的暖灰像素（RGB 150-240）合成为页面底后比面板亮、且不跟圆角，
       读作 L 形「方块边」。暖灰 b-r 为负、面板蓝 b-r 为正，用 b-r 的符号区分。
       云/猫（右侧 x>=466）不算面板外圈，排除。 */
    const BOTTOM_X_MAX = 466
    const bands: [string, number, number, number, number][] = [
      ['底缘', 307, img.height, 2, BOTTOM_X_MAX],
      ['右缘', 110, 286, 669, img.width],
      ['左缘', 109, 286, 0, 2],
    ]
    for (const [name, y0, y1, x0, x1] of bands) {
      let n = 0
      let cool = 0
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = y * img.width + x
          if (img.alpha[i] === 0) continue
          n += 1
          if (img.rgb[i * 3 + 2] > img.rgb[i * 3]) cool += 1
        }
      }
      expect(n, `${name}外圈像素数`).toBeGreaterThan(80)
      /* 面板蓝应占压倒多数；v9 该处只有 15-44% */
      expect(cool / n, `${name}外圈偏蓝占比`).toBeGreaterThan(0.85)
    }
  })
})
