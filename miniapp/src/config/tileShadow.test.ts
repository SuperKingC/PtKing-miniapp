import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import { miniappRoot } from './testPaths'

/* 测试条 tile 的方向性接触影契约（2026-09-12 用户反馈「气球和公文包的阴影需要像其他
   icon 一样在左边和下面」「还是没有其他 icon 阴影厚」）。

   参考稿 star/love/mbti 是整页裁切，自带不透明烘焙接触影：沿左缘与下缘按指数衰减
   向外淡出、上/右干净。v13 修黑晕边时把 body 外所有像素混向页面白，连带洗掉了影；
   v14 补了影带，但剖面是从「alpha≥200 的 body 掩膜」量的——掩膜把紧贴实体的不透明
   核心并进了 body，整条曲线外移一格，最厚的那档丢失，影比参考薄。v15 改用与页面
   距离定实体边缘，量出含核心的完整剖面并按实测影色重建。

   这里直接解码 PNG 核对：既有方向的（上/右干净、左/下有影），也有厚度的
   （近缘核心必须够厚，v14 那一版会在核心断言上失败）。 */

const PAGE = [254, 250, 244]
const PAGE_MEAN = (PAGE[0] + PAGE[1] + PAGE[2]) / 3

function decode(rel: string) {
  const png = PNG.sync.read(readFileSync(resolve(miniappRoot(), rel)))
  const lum = new Float64Array(png.width * png.height)
  const alpha = new Uint8Array(png.width * png.height)
  for (let i = 0; i < png.width * png.height; i += 1) {
    const a = png.data[i * 4 + 3] / 255
    const r = png.data[i * 4] * a + PAGE[0] * (1 - a)
    const g = png.data[i * 4 + 1] * a + PAGE[1] * (1 - a)
    const b = png.data[i * 4 + 2] * a + PAGE[2] * (1 - a)
    lum[i] = (r + g + b) / 3
    alpha[i] = png.data[i * 4 + 3]
  }
  return { width: png.width, height: png.height, lum, alpha }
}

/** 合成为页面白后，某像素相对页面的压暗量 */
function dark(img: ReturnType<typeof decode>, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return 0
  return Math.max(0, PAGE_MEAN - img.lum[y * img.width + x])
}

/** 实体框外沿中线带、逐像素外扩的压暗量均值 */
function bandMean(img: ReturnType<typeof decode>, side: 'left' | 'right' | 'top' | 'bottom', box: [number, number, number, number], depth: number) {
  const [x0, y0, x1, y1] = box
  const values: number[] = []
  if (side === 'left' || side === 'right') {
    const ya = y0 + Math.floor((y1 - y0) / 4)
    const yb = y1 - Math.floor((y1 - y0) / 4)
    for (let d = 1; d <= depth; d += 1) {
      const x = side === 'left' ? x0 - d : x1 + d
      if (x < 0 || x >= img.width) continue
      for (let y = ya; y <= yb; y += 1) values.push(dark(img, x, y))
    }
  } else {
    const xa = x0 + Math.floor((x1 - x0) / 4)
    const xb = x1 - Math.floor((x1 - x0) / 4)
    for (let d = 1; d <= depth; d += 1) {
      const y = side === 'top' ? y0 - d : y1 + d
      if (y < 0 || y >= img.height) continue
      for (let x = xa; x <= xb; x += 1) values.push(dark(img, x, y))
    }
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/* 实体框（px，右/下开区间）——与 prepare 脚本同口径 */
const BOX: [number, number, number, number] = [13, 9, 161, 156]
const BOX_CAREER: [number, number, number, number] = [14, 9, 161, 156]

describe('测试条 tile 接触影（对齐参考稿 star 的 baked 影）', () => {
  /* 参照：参考稿 star/mbti 的体外影剖面（合成为页面白后的压暗量）：
       下缘 d1..8 = 96.6 56.8 51.2 42.9 36.5 31.0 24.6 19.3
       左缘 d1..5 = 84.5 42.4 36.0 29.0 23.4
     v17 直接从参考稿移植影层，故断言「落在参考同档」而不是各写一套阈值。 */
  const REF_BOTTOM = [96.6, 56.8, 51.2, 42.9, 36.5, 31.0]
  const REF_LEFT = [84.5, 42.4, 36.0, 29.0]

  for (const [rel, box] of [
    ['src/assets/illus/tile-fun-v17.png', BOX],
    ['src/assets/illus/tile-career-v17.png', BOX_CAREER],
  ] as [string, [number, number, number, number]][]) {
    it(`${rel.split('/').pop()} 影剖面落在参考同档，上/右无落影`, () => {
      const img = decode(rel)
      const [x0, y0, x1, y1] = box
      const xa = x0 + Math.floor((x1 - x0) / 4)
      const xb = x1 - Math.floor((x1 - x0) / 4)
      const cy = y0 + Math.floor((y1 - y0) / 2)

      // 下缘逐格压暗（中线带），与参考逐格比对
      for (let i = 0; i < REF_BOTTOM.length; i += 1) {
        const d = i + 1
        let sum = 0
        // y1 是实体框的下开区间边界，即外侧第 1 行
        for (let x = xa; x <= xb; x += 1) sum += dark(img, x, y1 + d - 1)
        const got = sum / (xb - xa + 1)
        expect(got, `下缘 d${d}`).toBeGreaterThan(REF_BOTTOM[i] - 12)
        expect(got, `下缘 d${d}`).toBeLessThan(REF_BOTTOM[i] + 12)
      }
      for (let i = 0; i < REF_LEFT.length; i += 1) {
        const d = i + 1
        const got = dark(img, x0 - d, cy)
        expect(got, `左缘 d${d}`).toBeGreaterThan(REF_LEFT[i] - 12)
        expect(got, `左缘 d${d}`).toBeLessThan(REF_LEFT[i] + 12)
      }
      // 上/右不应有落影（参考稿上/右也是干净的）
      expect(bandMean(img, 'top', box, 3), '上缘不应有落影').toBeLessThan(10)
      expect(bandMean(img, 'right', box, 3), '右缘不应有落影').toBeLessThan(10)

      /* 「第二块板」判据：影必须是**方向性投影**——沿左缘竖直方向只在偏下的位置出现，
         而不是整条左边缘都被等量铺满。合成式影（v14-v16 沿轮廓等距铺一圈）会让左缘
         每一行都带 alpha（v16 实测非零占比 1.00、std 仅 32.7，远看就是背后垫了一块板）；
         参考稿与 v17 只在左缘下半段有影（非零占比 ≈0.34、std ≈90）。 */
      // 动态取每行实体左缘（v17 移植了参考影，影核贴体且不透明，硬编码框会偏内）
      const leftAlphas: number[] = []
      for (let y = y0; y <= y1; y += 1) {
        let ex = -1
        for (let x = 0; x < img.width; x += 1) {
          if (img.alpha[y * img.width + x] >= 250) { ex = x; break }
        }
        if (ex >= 2) leftAlphas.push(img.alpha[y * img.width + (ex - 2)])
      }
      const nonZero = leftAlphas.filter((v) => v > 8).length / leftAlphas.length
      expect(nonZero, '影不应铺满整条左缘（否则是「第二块板」）').toBeLessThan(0.6)
    })
  }

  it('参考稿 star/mbti 同向（左/下有影、上/右干净），确认口径一致', () => {
    for (const [rel, box] of [
      ['src/assets/illus/tile-star-v10.png', [10, 8, 164, 159]],
      ['src/assets/illus/tile-mbti-v10.png', [10, 8, 165, 155]],
    ] as [string, [number, number, number, number]][]) {
      const img = decode(rel)
      expect(bandMean(img, 'right', box, 3), `${rel} 右缘`).toBeLessThan(4)
      expect(bandMean(img, 'bottom', box, 6), `${rel} 下缘`).toBeGreaterThan(39)
    }
  })
})
