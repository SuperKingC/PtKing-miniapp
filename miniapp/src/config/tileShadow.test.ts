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

describe('测试条 tile 左+下方向性接触影', () => {
  for (const [rel, box] of [
    ['src/assets/illus/tile-fun-v16.png', BOX],
    ['src/assets/illus/tile-career-v16.png', BOX_CAREER],
  ] as [string, [number, number, number, number]][]) {
    it(`${rel.split('/').pop()} 左/下有厚影，上/右为黏土软收边`, () => {
      const img = decode(rel)
      const [x0, y0, x1, y1] = box
      const xa = x0 + Math.floor((x1 - x0) / 4)
      const xb = x1 - Math.floor((x1 - x0) / 4)
      const ya = y0 + Math.floor((y1 - y0) / 4)
      const yb = y1 - Math.floor((y1 - y0) / 4)
      /* 方向：影集中在下/左（上/右只允许一圈很短的软收边，不该有落影） */
      expect(bandMean(img, 'bottom', box, 6), '下缘影带厚度').toBeGreaterThan(36)
      expect(bandMean(img, 'left', box, 4), '左缘影带厚度').toBeGreaterThan(40)
      expect(bandMean(img, 'top', box, 3), '上缘不应有落影').toBeLessThan(bandMean(img, 'bottom', box, 6) * 0.9)
      expect(bandMean(img, 'right', box, 3), '右缘不应有落影').toBeLessThan(bandMean(img, 'bottom', box, 6) * 0.35)
      /* 厚度：紧贴实体的接触核心必须够厚。取边缘带上的最大值，避开逐列 1~2px 起伏
         （v14 丢核心时整条下缘首格都只有 ~52、左缘 ~44）。 */
      const coreBottom = Math.max(...Array.from({ length: xb - xa + 1 }, (_, i) => dark(img, xa + i, y1)))
      const coreLeft = Math.max(...Array.from({ length: yb - ya + 1 }, (_, i) => dark(img, x0 - 1, ya + i)))
      expect(coreBottom, '下缘接触核心').toBeGreaterThan(70)
      expect(coreLeft, '左缘接触核心').toBeGreaterThan(70)
      /* 影带必须「渐隐收尾」而不是被硬切。参考稿下缘外侧 alpha 在 d9..d12 依次
         233/174/95/39 一路衰减；v15 是 255 平铺到 d12 再直接归零，合到卡面上会露一圈
         平板边。断言 d10..d12 单调递减且末端已明显透明。 */
      const aAt = (d: number) => {
        const vals: number[] = []
        for (let x = xa; x <= xb; x += 1) vals.push(img.alpha[(y1 + d) * img.width + x])
        return vals.reduce((s, v) => s + v, 0) / vals.length
      }
      const a10 = aAt(10)
      const a11 = aAt(11)
      const a12 = aAt(12)
      expect(a10, '影带 d10 应已开始淡出').toBeLessThan(250)
      expect(a11, '影带 d11 应比 d10 更淡').toBeLessThan(a10)
      expect(a12, '影带 d12 应接近收尾').toBeLessThan(120)

      /* 上缘/右缘必须是「黏土色软收边」，不是 v13 那种把边缘洗白的硬边。
         判据：上缘最外一行应是半透明的本体色（有 alpha 但明显透过页面），
         且随距离快速收窄；旧实现上缘 alpha 会直接跳到 0（右缘）或只剩 18（上缘）。 */
      const edgeAt = (side: 'top' | 'right', d: number) => {
        const vals: number[] = []
        if (side === 'top') for (let x = xa; x <= xb; x += 1) vals.push(img.alpha[(y0 - d) * img.width + x])
        else for (let y = ya; y <= yb; y += 1) vals.push(img.alpha[y * img.width + x1 + d])
        return vals.reduce((s, v) => s + v, 0) / vals.length
      }
      expect(edgeAt('top', 1), '上缘第 1 行应是半透明黏土收边').toBeGreaterThan(40)
      expect(edgeAt('top', 1), '上缘收边不应是不透明实块').toBeLessThan(200)
      expect(edgeAt('top', 3), '上缘收边应很快收窄').toBeLessThan(edgeAt('top', 1))
      expect(edgeAt('right', 1), '右缘第 1 列应是半透明黏土收边').toBeGreaterThan(8)
      expect(edgeAt('right', 1), '右缘收边不应是不透明实块').toBeLessThan(200)
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
