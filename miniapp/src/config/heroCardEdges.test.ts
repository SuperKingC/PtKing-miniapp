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
   也换成最近本体色。

   2026-09-13 用户反馈「今日推荐栏边缘有锯齿，周围还被一个浅色方形包裹」：v10 的
   AA 重建（NEAREST 放大 + 过小高斯）实际只有 1px 过渡（0/47/254），TinyPNG 量化
   后曲线全是台阶锯齿；外圈裙边是参考稿灰蓝（合成后 ~236,234,231 的浅灰框）。
   v11 按 50% 等高线重建 2-3px 干净过渡（几何零漂移），裙边换最近本体色。这里
   直接解码 PNG 核对剖面与边缘颜色，防止再退回阶跃边或暖灰框。

   2026-09-14 用户反馈「今日推荐背景图边缘有浅浅的边缘」：v11 只做了 50% 等高线重建，
   完全没有做类似 v9 的裙边清理，四条边铺满 alpha=4/14/25/42/45/51 的低透明晕带
   （左缘剖面 [14,93,255]，x=0 就有 alpha=14），叠页面底就是明显的浅边方框。v12 分三步修：
   ①洪泛 THR=63 清掉全部浅晕（含左缘 alpha=14），但清完 AA 只剩 1px 过渡（[0,93,255]），
   mean<1.5 会失败且视觉偏硬；②对 AA 环外扩 2px 做 sigma=0.6 局部高斯，把 1px 过渡摊成
   多级坡（内部 255、外部 0 不动）；③TinyPNG 压缩后又在轮廓外塞回 107px alpha=35 浅晕，
   用 clean-alpha-skirt-v10.py --post-compress 在 P 模式下把这 107px 改写为透明 index
   （不动 RGB 调色板与 AA 半透明 index）。最终左缘 [0,102,229,255]、左缘平均过渡 2.01、
   边界连通低透明像素=0、alpha 级数=64。

   2026-09-14 三轮：v12 左缘 AA 仍吃进暗描边 RGB(159,178,187)，叠页底发暗环。
   v13 内收 1.5px + 内部本体色 AA + alpha<96 清零，左缘 [0,0,0,128,231,255]。

   2026-09-14 云朵：用户反馈右下云贴页底那条弧有台阶锯齿。v13 整卡 50% 等高线
   + NEAREST 重建把弧收成 1px 台阶。smooth-hero-cloud-v13.py 只抹 x>=400、y>=188
   的云底缘（沿 x 高斯抹圆 + 奶油色覆盖 AA），面板直边仍禁止 alpha<96。 */

const ASSET = 'src/assets/illus/hero-card-v13.png'

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

  it('外圈没有 alpha<96 的浅晕环（右下云底缘奶油 AA 除外）', () => {
    let n = 0
    for (let i = 0; i < img.alpha.length; i += 1) {
      const a = img.alpha[i]
      if (!(a > 0 && a < 96)) continue
      const x = i % img.width
      const y = (i - x) / img.width
      const cream = Math.min(img.rgb[i * 3], img.rgb[i * 3 + 1], img.rgb[i * 3 + 2]) >= 200
      if (x >= 400 && y >= 188 && cream) continue
      n += 1
    }
    expect(n, '非云底的 alpha 1..95 浅晕像素').toBe(0)
  })

  it('右下云底缘是多级奶油过渡，不是 255→0 台阶', () => {
    let hard = 0
    let columns = 0
    let rampPx = 0
    for (let x = 480; x < 660; x += 1) {
      let bottom = -1
      for (let y = img.height - 1; y >= 188; y -= 1) {
        if (img.alpha[y * img.width + x] > 0) { bottom = y; break }
      }
      if (bottom < 0) continue
      const i = bottom * img.width + x
      if (Math.min(img.rgb[i * 3], img.rgb[i * 3 + 1], img.rgb[i * 3 + 2]) < 200) continue
      columns += 1
      const seg = [3, 2, 1, 0].map((d) => img.alpha[Math.max(188, bottom - d) * img.width + x])
      if (seg.includes(255) && (bottom + 1 >= img.height || img.alpha[(bottom + 1) * img.width + x] === 0) && !seg.some((v) => v > 0 && v < 255)) hard += 1
      rampPx += seg.filter((v) => v > 0 && v < 255).length
    }
    expect(columns, '云底缘列数').toBeGreaterThan(80)
    expect(hard, '云底缘硬跳变列').toBe(0)
    expect(rampPx / columns, '云底缘平均过渡像素').toBeGreaterThan(1.2)
  })

  it('左缘 AA 用面板本体色，不是烘焙暗描边', () => {
    /* v12 左缘首个 AA 是 (159,178,187)，比本体 (190,206,213) 暗一截。 */
    const y = img.height >> 1
    let first: number[] | null = null
    for (let x = 0; x < 12; x += 1) {
      const i = y * img.width + x
      if (img.alpha[i] > 0 && img.alpha[i] < 255) {
        first = [img.rgb[i * 3], img.rgb[i * 3 + 1], img.rgb[i * 3 + 2]]
        break
      }
    }
    expect(first, '左缘存在 AA 像素').toBeTruthy()
    expect(first![0], '左缘 AA 红通道（暗描边病态约 159）').toBeGreaterThan(175)
    expect(first![2] > first![0], '左缘 AA 偏蓝').toBe(true)
  })

  it('外轮廓是多级过渡，不是 255→0 的单像素台阶', () => {
    const levels = new Set<number>()
    for (let i = 0; i < img.alpha.length; i += 1) levels.add(img.alpha[i])
    /* v8 二值化后仅 15 级；v13 经 TinyPNG 量化后约 20 级，仍是多级平滑坡 */
    expect(levels.size, 'alpha 级数').toBeGreaterThan(16)

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
      /* 近不透明的插画边缘（猫毛/云，a>=180）不是浅晕环 */
      if (a === 0 || a >= 180) continue
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
    expect(dark, '合成为页面底后明显压暗的 AA 环像素').toBeLessThan(450)
  })

  it('面板底/右外圈是面板蓝，不是参考稿带进的暖灰方块边', () => {
    /* v9 的残框清理漏下的暖灰像素（RGB 150-240）合成为页面底后比面板亮、且不跟圆角，
       读作 L 形「方块边」。暖灰 b-r 为负、面板蓝 b-r 为正，用 b-r 的符号区分。
       云/猫（右侧 x>=466）不算面板外圈，排除。 */
    const BOTTOM_X_MAX = 466
    const bands: [string, number, number, number, number][] = [
      ['底缘', 302, 308, 2, BOTTOM_X_MAX],
      ['右缘', 110, 286, 665, 669],
      ['左缘', 109, 286, 3, 6],
    ]
    for (const [name, y0, y1, x0, x1] of bands) {
      let n = 0
      let cool = 0
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = y * img.width + x
          if (img.alpha[i] === 0) continue
          /* 猫/云的近白奶油色不是「暖灰方块边」 */
          if (Math.min(img.rgb[i * 3], img.rgb[i * 3 + 1], img.rgb[i * 3 + 2]) >= 220) continue
          n += 1
          if (img.rgb[i * 3 + 2] > img.rgb[i * 3]) cool += 1
        }
      }
      expect(n, `${name}外圈像素数`).toBeGreaterThan(80)
      /* 面板蓝应占压倒多数；v9 该处只有 15-44% */
      expect(cool / n, `${name}外圈偏蓝占比`).toBeGreaterThan(0.85)
    }
  })

  it('右缘过渡带均匀收紧（不是 1px 硬边，也不是 9px+ 不规则晕带）', () => {
    /* v10 病根：AA 重建后过渡只有 1px（0/47/254），量化后曲线成台阶锯齿。
       v11 按 50% 等高线重建为均匀 2-3px 坡。沿右缘直段（y 100..260）统计每行
       0<alpha<255 的过渡像素数：必须存在、且不超过 5（v10 病态是 0 或 9-16）。 */
    const widths: number[] = []
    for (let y = 100; y < 260; y += 4) {
      let n = 0
      for (let x = img.width - 1; x >= img.width - 20; x -= 1) {
        const a = img.alpha[y * img.width + x]
        if (a > 0 && a < 255) n += 1
        else if (n > 0) break
      }
      widths.push(n)
    }
    expect(widths.some((n) => n > 0), '右缘存在过渡像素').toBe(true)
    for (const w of widths) {
      expect(w, '右缘过渡像素数').toBeLessThanOrEqual(5)
    }
  })
})
