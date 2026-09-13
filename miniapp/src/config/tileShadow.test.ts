import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import { miniappRoot } from './testPaths'

/* 测试条 tile 的下/左接触棱契约（2026-09-13 用户反馈「气球和公文包的阴影需要和其他的一样，
   现在不仅阴影不统一还有锯齿」）。

   参考稿（star/love/mbti 整页裁切）的边不是**外侧投影**，而是实体自带的一圈**内翻软陶棱**：
   自视觉边向内 ~11px 压成一条暖褐接触棱（下缘最暗，合成色约 #c48c62），再向内 ~22px 回到板面；
   最外 1~4px 是低 alpha 的浅色余晖。左缘同形但更浅、峰在 ~5px。上/右与左上角干净。

   历史上 v19/v20 把影铺在实体**外侧**（方向相反），峰值仅 ~78，还在画布底留下一块
   alpha≈82 的近白平板；实体边 alpha 只有 78/198 两级台阶（锯齿来源）。v21 修了方向但
   权重从边缘线性衰减，最深 k≈11 只剩 ~56% 力度（峰值 92 对参考 105~114，棱发虚），
   且「参考色+板面偏移」重绘把公文包的棱染成脏紫灰；v22 改为 k≤16 全力 + 乘性比率
   （clamp ≤1.02 只允许压暗）。本测试直接解码 PNG 核对三件事：
   ① 下/左棱的**峰位与量级**与参考 love 同档；② 体外没有 alpha 平板（也不是锯齿台阶）；
   ③ 上/右干净。 */

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
  return { x0, y0, x1, y1 }
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

const REF = 'src/assets/illus/tile-love-v10.png'
const TILES = ['src/assets/illus/tile-fun-v22.png', 'src/assets/illus/tile-career-v22.png']

describe('测试条 tile 与参考 tile 同族（下/左内翻接触棱）', () => {
  it('下缘棱的峰位与量级与参考 love 同档', () => {
    const ref = inwardProfile(REF, 'bottom')
    const refPeak = Math.max(...ref)
    const refAt = ref.indexOf(refPeak)
    for (const rel of TILES) {
      const got = inwardProfile(rel, 'bottom')
      const peak = Math.max(...got)
      const at = got.indexOf(peak)
      const name = rel.split('/').pop()
      // 峰位：参考在视觉边内 ~11px（±3px 容差）
      expect(Math.abs(at - refAt), `${name} 下缘棱峰位（参考 ${refAt}px）`).toBeLessThanOrEqual(3)
      // 峰值：与参考同档（低 30% 以内；v19/v20 只有 ~78，会在这里失败）
      expect(peak, `${name} 下缘棱峰值（参考 ${refPeak.toFixed(0)}）`).toBeGreaterThan(refPeak * 0.7)
    }
  })

  it('左缘棱存在且与参考同档', () => {
    const ref = inwardProfile(REF, 'left')
    const refPeak = Math.max(...ref)
    for (const rel of TILES) {
      const got = inwardProfile(rel, 'left')
      const peak = Math.max(...got)
      const name = rel.split('/').pop()
      expect(peak, `${name} 左缘棱峰值（参考 ${refPeak.toFixed(0)}）`).toBeGreaterThan(refPeak * 0.7)
    }
  })

  it('实体外没有 alpha 平板，且边缘是连续斜坡（无锯齿台阶）', () => {
    for (const rel of TILES) {
      const img = decode(rel)
      const { x0, y0, x1, y1 } = solidBox(img)
      const name = rel.split('/').pop()
      // 体外 >2px 不应有 alpha：v20 在实体下方铺了一整块 alpha≈82 的近白平板
      let outside = 0
      for (let y = 0; y < img.height; y += 1) {
        for (let x = 0; x < img.width; x += 1) {
          const a = img.alpha[y * img.width + x]
          if (a <= 4) continue
          const beyond = y > y1 + 2 || x < x0 - 2 || x > x1 + 2 || y < y0 - 2
          if (beyond) outside += 1
        }
      }
      expect(outside, `${name} 体外不应有残留 alpha（近白平板/外溢）`).toBe(0)

      // 边缘 alpha 应是连续斜坡：v20 只有 78/198 两级台阶
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
      const xb = x1 - Math.floor((x1 - x0) / 3)
      const ya = y0 + Math.floor((y1 - y0) / 3)
      const yb = y1 - Math.floor((y1 - y0) / 3)
      const name = rel.split('/').pop()
      for (const d of [1, 2, 3]) {
        const top = PAGE_MEAN - img.lum[Math.max(y0 - d, 0) * img.width + xa]
        expect(top, `${name} 上缘 d${d}`).toBeLessThan(12)
        const right = PAGE_MEAN - img.lum[ya * img.width + Math.min(x1 + d, img.width - 1)]
        expect(right, `${name} 右缘 d${d}`).toBeLessThan(12)
        void xb
        void yb
      }
    }
  })
})
