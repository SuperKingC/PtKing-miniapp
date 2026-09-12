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

   判定用「最外圈不能比页面底更暖」：裙边该淡到页面底，而不是淡到一种更暖的灰。
   实测 v6 外圈 +13（失败）、v7 +8（通过）；已验收的 hero-card v10 同样是 +7.7，
   v9 病态版 +14。 */

const ASSET = 'src/assets/illus/me-banner-panel-v7.png'
/* 页面底色 (254,250,245) 的暖度基准 */
const PAGE_WARMTH = 9
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
    let sumR = 0
    let sumB = 0
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4
        const a = data[i + 3]
        if (a === 0 || a >= OUTER_ALPHA) continue
        n += 1
        sumR += data[i]
        sumB += data[i + 2]
      }
    }
    expect(n, '最外圈像素数').toBeGreaterThan(1000)
    const warmth = (sumR - sumB) / n
    /* 裙边该淡向页面底（+9），不该淡向更暖的灰；给 1 级容差 */
    expect(warmth, '最外圈暖度(R-B)').toBeLessThanOrEqual(PAGE_WARMTH + 1)
  })
})
