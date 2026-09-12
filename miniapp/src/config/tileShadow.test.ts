import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import { miniappRoot } from './testPaths'

/* 测试条 tile 的方向性接触影契约（2026-09-12 用户反馈「气球和公文包的阴影需要像其他
   icon 一样在左边和下面」）。参考稿 star/love/mbti 是整页裁切，自带不透明烘焙接触影，
   沿左缘与下缘按指数衰减向外淡出、上/右干净；v13 修黑晕边时把 body 外所有像素混向页面白，
   连带洗掉了影，只留 body 边缘 AA。v14 以 v13 为基底重烘焙左+下影带。
   这里直接解码 PNG 核对方向，防止再退回无影版本。 */

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

/** 某像素相对页面的压暗量（合成为页面白后） */
function dark(img: ReturnType<typeof decode>, x: number, y: number): number {
  return Math.max(0, PAGE_MEAN - img.lum[y * img.width + x])
}

/** 沿中线带、在实体框外逐像素外扩的压暗量均值 */
function bandMean(img: ReturnType<typeof decode>, side: 'left' | 'right' | 'top' | 'bottom', x0: number, y0: number, x1: number, y1: number, depth: number) {
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

/* 与 prepare 脚本一致的实体框（px，右/下开区间） */
const BODY: Record<string, [number, number, number, number]> = {
  'src/assets/illus/tile-fun-v14.png': [13, 9, 161, 156],
  'src/assets/illus/tile-career-v14.png': [14, 9, 161, 156],
  'src/assets/illus/tile-star-v10.png': [10, 8, 164, 159],
}

describe('测试条 tile 左+下方向性接触影', () => {
  for (const [rel, box] of Object.entries(BODY)) {
    it(`${rel.split('/').pop()} 左缘/下缘有影，上缘/右缘干净`, () => {
      const img = decode(rel)
      const [x0, y0, x1, y1] = box
      const left = bandMean(img, 'left', x0, y0, x1, y1, 4)
      const bottom = bandMean(img, 'bottom', x0, y0, x1, y1, 6)
      const top = bandMean(img, 'top', x0, y0, x1, y1, 3)
      const right = bandMean(img, 'right', x0, y0, x1, y1, 3)
      expect(bottom, '下缘影带').toBeGreaterThan(20)
      expect(left, '左缘影带').toBeGreaterThan(15)
      expect(top, '上缘应干净').toBeLessThan(4)
      expect(right, '右缘应干净').toBeLessThan(4)
      /* 左缘弱于下缘（右上打光）但同向存在 */
      expect(left).toBeGreaterThan(bottom * 0.4)
    })
  }
})
