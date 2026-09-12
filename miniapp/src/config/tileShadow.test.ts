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

describe('测试条 tile 与参考 tile 同族（影）', () => {
  /* 参照物用**同色系的 love（爱心）**：它和气球/公文包一样是暖色 tile，且三者在 App 里
     同屏相邻，直接比剖面最贴近用户看到的观感。
     （先前拿雾蓝 star 当参照，其影强度约是暖色 tile 的 2 倍、贴体那格还带蓝偏，
       搬过来就是我们看到的「脏灰圈」。） */
  const REF = 'src/assets/illus/tile-love-v10.png'
  const NEAR = [0.55, 0.75, 0.75, 0.6, 0.6, 0.6]   // 逐格容差（比值，避免绝对阈值随尺寸漂移）

  /** 沿实体的外缘（不透明像素之外）逐格量压暗，返回 [下缘, 左缘] */
  function edgeProfile(rel: string) {
    const img = decode(rel)
    // 实体范围 ≈ 不透明像素的行列包络（影核不透明，故包络会略大于实体，
    // 但参考与我们的资产同法测量，比较的是相对差异）
    const cols: number[] = []
    const rows: number[] = []
    for (let y = 0; y < img.height; y += 1) {
      for (let x = 0; x < img.width; x += 1) {
        if (img.alpha[y * img.width + x] >= 250) { rows.push(y); cols.push(x) }
      }
    }
    const y0 = Math.min(...rows); const y1 = Math.max(...rows)
    const x0 = Math.min(...cols); const x1 = Math.max(...cols)
    const xa = x0 + Math.floor((x1 - x0) / 4)
    const xb = x1 - Math.floor((x1 - x0) / 4)
    const cy = (y0 + y1) / 2 | 0
    const bot: number[] = []
    for (let d = 0; d <= 5; d += 1) {
      let sum = 0; let n = 0
      for (let x = xa; x <= xb; x += 1) { sum += dark(img, x, y1 + d); n += 1 }
      bot.push(sum / n)
    }
    const lft: number[] = []
    for (let d = 0; d <= 4; d += 1) lft.push(dark(img, x0 - d, cy))
    return { bot, lft }
  }

  const ref = edgeProfile(REF)

  for (const rel of ['src/assets/illus/tile-fun-v19.png', 'src/assets/illus/tile-career-v19.png']) {
    it(`${rel.split('/').pop()} 影剖面与参考 love 同档`, () => {
      const got = edgeProfile(rel)
      for (let i = 0; i < ref.bot.length; i += 1) {
        const r = ref.bot[i]
        const tol = Math.max(3, r * NEAR[i])
        expect(Math.abs(got.bot[i] - r), `下缘 d${i}（参考 ${r.toFixed(1)}）`).toBeLessThan(tol)
      }
      for (let i = 0; i < ref.lft.length; i += 1) {
        const r = ref.lft[i]
        const tol = Math.max(3, r * NEAR[i])
        expect(Math.abs(got.lft[i] - r), `左缘 d${i}（参考 ${r.toFixed(1)}）`).toBeLessThan(tol)
      }
      // 边缘不得有孤立异色点：移植影时圆角处会夹带参考实体自己的 AA 边颜色，
      // 表现为「四周亮、自身暗」的孤立点（实测旧实现 9~12 个、参考为 0）。
      const img = decode(rel)
      const lumAt = (x: number, y: number) => img.lum[y * img.width + x]
      let odd = 0
      for (let y = 1; y < img.height - 1; y += 1) {
        for (let x = 1; x < img.width - 1; x += 1) {
          if (img.alpha[y * img.width + x] < 10) continue
          const bright = [lumAt(x, y - 1), lumAt(x, y + 1), lumAt(x - 1, y), lumAt(x + 1, y)]
            .filter((v) => v > 246).length
          if (bright >= 3 && lumAt(x, y) < 238) odd += 1
        }
      }
      expect(odd, '边缘不应有孤立异色点').toBe(0)

      // 上/右不应有落影
      expect(bandMean(img, 'top', BOX, 3), '上缘不应有落影').toBeLessThan(10)
      expect(bandMean(img, 'right', BOX, 3), '右缘不应有落影').toBeLessThan(10)
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
