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

   v9 直接移除这层外圈裙边，最外圈不再参与合成。 */

const ASSET = 'src/assets/illus/me-banner-panel-v9.png'
const OUTER_ALPHA = 10   /* 只取最淡的一圈裙边（alpha 1..9） */

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
