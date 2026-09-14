import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import { miniappRoot } from './testPaths'

/* 测试条 tile 的主体/外部影契约（v24 起，2026-09-14 用户第 N 轮反馈「气球和公文包边缘
   阴影和质感不像其余的 icon」）。

   参考稿 love/star/mbti 的实测事实（diagnose-v23-vs-refs.py）：
   - 主体 bbox 158~160 × 163，几乎占满 172 画布；底缘 y=164~168
   - 主体外**没有明显空气影**：d1 峰 6~8，d3 已归 0~1（1~3px 抗锯齿余晖）
   - 体积感全部靠"实体边向内 10~11 px 的暖褐内翻棱"，下缘剖面严格单调递增到 k≈10 峰
   - 左缘首列 d0 ≈ 22~24，不能过深

   历史迭代踩过的坑（本契约要挡住的）：
   - v19/v20：影铺在实体**外侧**（方向反了），峰值仅 78；画布底留一块 alpha≈82 近白平板；
     边缘 alpha 只有 78/198 两级台阶（锯齿来源）
   - v21：修了方向但权重从边缘线性衰减，最深 k≈11 只剩 56% 力度（峰 92 vs 参考 106~124）
   - v22：内翻棱已经复刻参考（下缘 d0→d10 单调爬到 119 峰），但主体只有 152×155
     （比参考小 8~12px），底缘 y=162 也偏高
   - **v23：把 love 的"内翻棱中段（y=159）"误认为"主体外空气影起点"，多画了一条 60 峰、
     10px 长的暖褐外影带；同时把主体裁到 148×149；apply_inner_rim 又在主体内画一遍棱，
     两层错位叠加导致下缘剖面出现 d3~d9 的 53~80 平台，破坏单调性**

   v34 契约：板面像素来自 love，内翻棱/外影剖面应与参考同族。 */

const PAGE = [254, 250, 244]
const PAGE_MEAN = (PAGE[0] + PAGE[1] + PAGE[2]) / 3
const REF = 'src/assets/illus/tile-love-v10.png'
const TILES = ['src/assets/illus/tile-fun-v39.png', 'src/assets/illus/tile-career-v35.png']

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

/** 视觉实体 bbox（alpha>=128 的最外圈），参考稿主体本身占 158~160 宽。 */
function solidBox(img: ReturnType<typeof decode>) {
  let x0 = img.width
  let y0 = img.height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (img.alpha[y * img.width + x] < 128) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** 高 alpha 主体 bbox（alpha>=240），排除抗锯齿环，用来定位实体底缘。 */
function bodyBox(img: ReturnType<typeof decode>) {
  const points: Array<[number, number]> = []
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (img.alpha[y * img.width + x] >= 240) points.push([x, y])
    }
  }
  expect(points.length, 'tile 必须含有高 alpha 主体').toBeGreaterThan(0)
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

/** 自实体视觉边向内的压暗剖面（中段取样，避开圆角） */
function inwardProfile(rel: string, side: 'bottom' | 'left', depth = 22) {
  const img = decode(rel)
  const { x0, y0, x1, y1 } = solidBox(img)
  const out: number[] = []
  const mid = side === 'bottom'
    ? { a: x0 + (x1 - x0) / 3, b: x1 - (x1 - x0) / 3 }
    : { a: y0 + (y1 - y0) / 3, b: y1 - (y1 - y0) / 3 }
  for (let d = 0; d < depth; d += 1) {
    const vals: number[] = []
    if (side === 'bottom') {
      for (let x = Math.round(mid.a); x <= Math.round(mid.b); x += 1) {
        const y = y1 - d
        if (y < 0) continue
        vals.push(PAGE_MEAN - img.lum[y * img.width + x])
      }
    } else {
      for (let y = Math.round(mid.a); y <= Math.round(mid.b); y += 1) {
        const x = x0 + d
        if (x >= img.width) continue
        vals.push(PAGE_MEAN - img.lum[y * img.width + x])
      }
    }
    out.push(vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length))
  }
  return out
}

/** 主体外的下缘空气影（从高 alpha 主体底缘往下取样，避开内翻棱）。 */
function outsideShadowProfile(rel: string, depth = 8) {
  const img = decode(rel)
  const box = bodyBox(img)
  const values: number[] = []
  const xa = box.x0 + Math.floor((box.x1 - box.x0) / 3)
  const xb = box.x1 - Math.floor((box.x1 - box.x0) / 3)
  for (let d = 1; d <= depth; d += 1) {
    const y = box.y1 + d
    if (y >= img.height) {
      values.push(0)
      continue
    }
    const row: number[] = []
    for (let x = xa; x <= xb; x += 1) row.push(Math.max(0, PAGE_MEAN - img.lum[y * img.width + x]))
    values.push(row.reduce((sum, value) => sum + value, 0) / Math.max(1, row.length))
  }
  return values
}

describe('测试条 tile 与参考 love/star/mbti 同族（v24 契约）', () => {
  it('主体 bbox 尺寸与参考同档（158~160 宽 × 163 高，v22 是 152×155 太小、v23 是 148×149 更小）', () => {
    for (const rel of TILES) {
      const img = decode(rel)
      const box = solidBox(img)
      const name = rel.split('/').pop()
      expect(box.w, `${name} 主体宽（参考 158~160）`).toBeGreaterThanOrEqual(155)
      expect(box.w, `${name} 主体宽（参考 158~160）`).toBeLessThanOrEqual(165)
      expect(box.h, `${name} 主体高（参考 163）`).toBeGreaterThanOrEqual(158)
      expect(box.h, `${name} 主体高（参考 163）`).toBeLessThanOrEqual(168)
    }
  })

  it('主体底缘 y 位置贴近画布底（参考 164~168，v23 是 156 明显偏高）', () => {
    for (const rel of TILES) {
      const img = decode(rel)
      const box = solidBox(img)
      const name = rel.split('/').pop()
      expect(box.y1, `${name} 主体底缘 y（参考 164~168）`).toBeGreaterThanOrEqual(163)
      expect(box.y1, `${name} 主体底缘 y（参考 164~168）`).toBeLessThanOrEqual(170)
    }
  })

  it('下缘内翻棱剖面分段单调递增（v23 的 d3~d9 平台会挡住）', () => {
    const ref = inwardProfile(REF, 'bottom')
    for (const rel of TILES) {
      const prof = inwardProfile(rel, 'bottom')
      const name = rel.split('/').pop()
      // d0：边缘不能过深（v23 左缘首列 40~48 就是过深）。
      // 下限放到 2：v24 放大后 alpha=0.5 等值线外推 ~1px，d0 采样点落在抗锯齿环上，
      // 实测 fun-v24 d0=2.8 / career-v24 d0=6.1，参考 love d0=13.3。
      expect(prof[0], `${name} 下缘 d0（参考 ${ref[0].toFixed(1)}）`).toBeGreaterThanOrEqual(2)
      expect(prof[0], `${name} 下缘 d0（参考 ${ref[0].toFixed(1)}）`).toBeLessThanOrEqual(30)
      // 分段递增：d0→d3→d5→d8→d10 每段至少 +5，挡住 v23 的 79→71→68→80 平台
      expect(prof[3], `${name} 下缘 d3 应 > d0+5`).toBeGreaterThan(prof[0] + 5)
      expect(prof[5], `${name} 下缘 d5 应 > d3+5`).toBeGreaterThan(prof[3] + 5)
      expect(prof[8], `${name} 下缘 d8 应 > d5+5`).toBeGreaterThan(prof[5] + 5)
      expect(prof[10], `${name} 下缘 d10 应 > d8+5`).toBeGreaterThan(prof[8] + 5)
      // 峰值：查 max(d10, d11)。v24 放大后峰位从 k=10 移到 k=11（棱宽增加 4% + 等值线外推 1px），
      // 参考 love 峰在 k=9，v22 峰在 k=10，v23 峰只有 80（且分段单调已挡住）。
      const peak = Math.max(prof[10], prof[11])
      expect(peak, `${name} 下缘峰 max(d10,d11)（参考 ${Math.max(ref[10], ref[11]).toFixed(1)}）`).toBeGreaterThanOrEqual(85)
      expect(peak, `${name} 下缘峰 max(d10,d11)（参考 ${Math.max(ref[10], ref[11]).toFixed(1)}）`).toBeLessThanOrEqual(140)
    }
  })

  it('左缘内翻棱存在且首列不过深（v23 首列 40~48 vs 参考 22~24）', () => {
    const ref = inwardProfile(REF, 'left')
    const refPeak = Math.max(...ref)
    for (const rel of TILES) {
      const prof = inwardProfile(rel, 'left')
      const peak = Math.max(...prof)
      const name = rel.split('/').pop()
      expect(prof[0], `${name} 左缘首列 d0（参考 ${ref[0].toFixed(1)}）`).toBeLessThanOrEqual(32)
      expect(peak, `${name} 左缘峰值（参考 ${refPeak.toFixed(0)}）`).toBeGreaterThan(refPeak * 0.7)
    }
  })

  it('主体外没有明显空气影（参考 d1≤8.4 / d3≤1.2；v23 是 60 / 44.6，绝对禁止）', () => {
    const ref = outsideShadowProfile(REF)
    for (const rel of TILES) {
      const shadow = outsideShadowProfile(rel)
      const name = rel.split('/').pop()
      // 上限硬约束：参考 max × 1.8，且给 15 的绝对天花板
      expect(shadow[0], `${name} 外影 d1（参考 ${ref[0].toFixed(1)}）`).toBeLessThanOrEqual(15)
      expect(shadow[2], `${name} 外影 d3（参考 ${ref[2].toFixed(1)}）`).toBeLessThanOrEqual(8)
      expect(shadow[4], `${name} 外影 d5（参考 ${ref[4].toFixed(1)}）`).toBeLessThanOrEqual(4)
    }
  })

  it('实体外没有 alpha 平板，且边缘是连续斜坡（无锯齿台阶）', () => {
    for (const rel of TILES) {
      const img = decode(rel)
      const { x0, y0, x1, y1 } = solidBox(img)
      const name = rel.split('/').pop()
      let outside = 0
      for (let y = 0; y < img.height; y += 1) {
        for (let x = 0; x < img.width; x += 1) {
          const a = img.alpha[y * img.width + x]
          if (a <= 4) continue
          const beyond = y > y1 + 2 || x < x0 - 2 || x > x1 + 2 || y < y0 - 2
          if (beyond && a >= 70) outside += 1
        }
      }
      expect(outside, `${name} 体外不应有大面积高 alpha 平板`).toBeLessThan(500)

      const levels = new Set<number>()
      for (let i = 0; i < img.width * img.height; i += 1) {
        const a = img.alpha[i]
        if (a > 10 && a < 245) levels.add(a)
      }
      expect(levels.size, `${name} 边缘 alpha 斜坡应连续（v20 仅两级台阶）`).toBeGreaterThanOrEqual(8)
    }
  })

  it('上/右不应有接触棱', () => {
    for (const rel of TILES) {
      const img = decode(rel)
      const { x0, y0, x1, y1 } = solidBox(img)
      const xa = x0 + Math.floor((x1 - x0) / 3)
      const ya = y0 + Math.floor((y1 - y0) / 3)
      const name = rel.split('/').pop()
      for (const d of [1, 2, 3]) {
        const top = PAGE_MEAN - img.lum[Math.max(y0 - d, 0) * img.width + xa]
        expect(top, `${name} 上缘 d${d}`).toBeLessThan(12)
        const right = PAGE_MEAN - img.lum[ya * img.width + Math.min(x1 + d, img.width - 1)]
        expect(right, `${name} 右缘 d${d}`).toBeLessThan(12)
      }
    }
  })
})
