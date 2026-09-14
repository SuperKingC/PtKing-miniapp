import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import { miniappRoot } from './testPaths'

/* 测测子品牌栏（me-banner）外圈颜色契约。资产来自参考稿直裁 + 4x 超采样几何圆角
   alpha 蒙版（prepare-banner-geom.py / fix-banner-corners.py），蒙版只改 alpha、
   不动 RGB，所以外圈裙边携带的是源图该处的颜色。

   2026-09-12 用户反馈「我的页里面的测测子也有一样的问题，没切干净」：裙边夹着参考稿
   裁切边界与页面暖色，TinyPNG 有损量化又把最外圈（alpha≈5）折叠成单一暖色
   (229,225,216)——面板本体是冷蓝，外圈却比页面底（254,250,245，暖度 R-B=+9）还暖
   （+13），读作一圈没切干净的暖白软边。v7 把非不透明裙边像素换成最近不透明本体色。

   2026-09-13 用户反馈「测测子栏边缘有锯齿，周围还被一个浅色方形包裹」：v7 的 alpha
   是 v6 传下来的 7-8px 羽化坡（0/5/29/88/167/226/250），外圈低透明暖灰带铺满矩形
   四周读作「浅色方框」，TinyPNG 量化到 26 级后坡上出色阶（锯齿）。v8 按 50% 等高线
   重建 2-3px 干净过渡（几何零漂移），外圈晕带由新坡接管。回归契约：中行边缘的
   羽化宽度不得超过 5px（v7 病态 7-8px，v8 实测 4px）。

   v9 直接移除这层外圈裙边，最外圈不再参与合成。

   2026-09-14 用户反馈「测测子背景图边缘有浅浅的边缘」：v9 的裙边洪泛阈值 LOW_ALPHA_MAX=31
   太低，TinyPNG 压缩后圆角外仍残留 66 个 alpha=41（RGB=[229,225,216] 暖灰）的浅晕像素，
   沿四个圆角连成一圈，叠到米白页面底上读作「浅浅的边缘」。v10 把洪泛阈值提到 63，精准清掉
   这 66px 浅晕（41<=63 命中），AA 过渡带 67/167/225/255 完全不动（67>63 不被视为可通行区）。
   清理后左缘剖面 [0,0,0,0,67,167,225,255]，边界连通低透明像素=0。

   2026-09-14 二轮反馈「测测子的还是有问题」：v10 的 AA 过渡带 RGB 仍夹参考稿暖米色，
   叠页面底是一圈 2px 异色细环。v11 在 v10 基础上补 defringe（AA 带 RGB 换最近不透明
   本体冷蓝）；但像素级 defringe 扛不过 TinyPNG 的 PNG8 全局调色板量化——同一条暖棕
   调色板项会被复用到冷白边缘的 AA 像素上（实测 (700,13) prepared 冷白 (238,241,239)
   被量化成暖米 (242,231,217)），且污染不止最外圈一层。v11 压缩后再跑 fix_edge_band：
   边缘带内逐像素 snap 回 7×7 窗口内最近不透明本体色，见下方「同色相」契约。

   2026-09-14 三轮：v11 最外圈仍是 alpha=67 叠页底的浅灰环。v12 内收 1.5px 后重建
   2px 平滑坡，alpha<96 一律清零，AA 换内部本体色。 */

const ASSET = 'src/assets/illus/me-banner-panel-v12.png'
const OUTER_ALPHA = 96   /* 浅晕环：alpha 1..95 一律不应再出现 */

function decode(rel: string) {
  const png = PNG.sync.read(readFileSync(resolve(miniappRoot(), rel)))
  return { width: png.width, height: png.height, data: png.data }
}

describe('测测子品牌栏外圈颜色', () => {
  const img = decode(ASSET)

  it('最外圈裙边不夹比页面底更暖的参考稿灰', () => {
    const { width: W, height: H, data } = img
    let n = 0
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4
        const a = data[i + 3]
        if (a === 0 || a >= OUTER_ALPHA) continue
        n += 1
      }
    }
    expect(n, '最外圈低透明度裙边像素数').toBe(0)
  })

  it('边缘羽化宽度不超过 5px（无铺满四周的浅色晕带）', () => {
    /* v7 病根：7-8px 羽化坡，外圈 alpha 5~29 的低透明带合成后读作一圈「浅色方框」。
       沿四边中部统计每行/列 0<alpha<255 的连续过渡像素数。 */
    const { width: W, height: H, data } = img
    const at = (x: number, y: number) => data[(y * W + x) * 4 + 3]
    const rampWidth = (get: (i: number) => number, n: number) => {
      let count = 0
      for (let i = 0; i < n; i += 1) {
        const a = get(i)
        if (a > 0 && a < 255) count += 1
        else if (count > 0) break
      }
      return count
    }
    const midY = H >> 1
    const midX = W >> 1
    const widths = [
      rampWidth((i) => at(i, midY), 12),               /* 左缘 */
      rampWidth((i) => at(W - 1 - i, midY), 12),       /* 右缘 */
      rampWidth((i) => at(midX, i), 12),               /* 顶缘 */
      rampWidth((i) => at(midX, H - 1 - i), 12),       /* 底缘 */
    ]
    for (const w of widths) {
      expect(w, '边缘羽化宽度(px)').toBeGreaterThan(0)
      expect(w, '边缘羽化宽度(px)').toBeLessThanOrEqual(5)
    }
  })

  it('AA 过渡带 RGB 与最近不透明本体色同色相（无暖米色异色细环）', () => {
    /* 2026-09-14 二轮反馈「测测子的还是有问题」：v10 只清了低 alpha 裙边，AA 过渡带
       RGB 仍是几何蒙版从参考稿带出的暖米色（左缘 a=67 为 (225,220,209)，B-R=-16），
       本体却是冷蓝 (218,223,222)（B-R=+4）。叠米白页面底渲染出 2px 暖米色异色细环，
       即用户眼中的「浅浅的边缘」（实机截图剖面 254,251,246→243,240,231→226,230,229）。
       尺子取「7×7 窗口内最近不透明本体色的最大通道差」而非全局膨胀均值：底缘烘焙暖棕
       厚度带与面板本体交汇处，膨胀法会把交界 AA 像素判给错误一侧（假阳性 diff 32+），
       窗口法两侧本体都算候选（交界实测 <=6）。与管线 fix_edge_band 同一把尺子。 */
    const { width: W, height: H, data } = img
    /* 只考「距 alpha=0 六像素内」的边缘带：内部插画的合法软半透明像素（如 a=254 的
       云影细节）不是异色边晕，不纳入契约。 */
    const n = W * H
    let band = new Uint8Array(n)
    for (let i = 0; i < n; i += 1) if (data[i * 4 + 3] === 0) band[i] = 1
    for (let d = 0; d < 6; d += 1) {
      const next = Uint8Array.from(band)
      for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
          const i = y * W + x
          if (band[i] === 1) continue
          if ((x > 0 && band[i - 1] === 1) || (x < W - 1 && band[i + 1] === 1) ||
            (y > 0 && band[i - W] === 1) || (y < H - 1 && band[i + W] === 1)) next[i] = 1
        }
      }
      band = next
    }
    let worst = 0
    let worstAt = ''
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const i = y * W + x
        const a = data[i * 4 + 3]
        if (a === 0 || a === 255 || band[i] === 0) continue
        /* 7×7 窗口内所有不透明本体色，取与本像素最大通道差最小者 */
        let best = Number.POSITIVE_INFINITY
        for (let wy = Math.max(0, y - 3); wy <= Math.min(H - 1, y + 3); wy += 1) {
          for (let wx = Math.max(0, x - 3); wx <= Math.min(W - 1, x + 3); wx += 1) {
            const j = (wy * W + wx) * 4
            if (data[j + 3] !== 255) continue
            const d = Math.max(
              Math.abs(data[i * 4] - data[j]),
              Math.abs(data[i * 4 + 1] - data[j + 1]),
              Math.abs(data[i * 4 + 2] - data[j + 2]),
            )
            if (d < best) best = d
          }
        }
        if (best > worst) {
          worst = best
          worstAt = '(' + x + ',' + y + ') a=' + a
        }
      }
    }
    /* 阈值 12：PNG8 量化后角部最多残 2px、通道差 11；真正的异色细环病态
       （v10 暖米 AA vs 冷蓝本体）实测 42+，在此阈值下仍红。 */
    expect(worst, 'AA 带与最近本体色最大通道差 @' + worstAt).toBeLessThanOrEqual(12)
  })

  it('直边外侧不保留低透明度的方形裙边', () => {
    const { width: W, height: H, data } = img
    const at = (x: number, y: number) => data[(y * W + x) * 4 + 3]
    const edgeHasLowAlpha = (get: (i: number) => number, n: number) => {
      for (let i = 0; i < n; i += 1) {
        const a = get(i)
        if (a > 0 && a < 32) return true
        if (a >= 255) break
      }
      return false
    }
    const midY = H >> 1
    const midX = W >> 1
    const hasSkirt = [
      edgeHasLowAlpha((i) => at(i, midY), 12),
      edgeHasLowAlpha((i) => at(W - 1 - i, midY), 12),
      edgeHasLowAlpha((i) => at(midX, i), 12),
      edgeHasLowAlpha((i) => at(midX, H - 1 - i), 12),
    ]
    expect(hasSkirt, '四条直边中心不应出现低透明度方形裙边').toEqual([false, false, false, false])
  })
})
