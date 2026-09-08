/**
 * 生成原生 tabBar 图标（81×81，微信官方建议尺寸）。
 * 用法：NODE_PATH=<含 sharp 的 node_modules> node tools/make-tabbar-icons.cjs
 * 本仓库未装 sharp 时可借 Pet10 工作区：NODE_PATH=D:/Pet10/node_modules
 * 输出：src/assets/tabbar/{test,tarot,records,me}[-active].png，圆润线性图标两色（灰/品牌紫）。
 */
const sharp = require('sharp')
const { mkdirSync, writeFileSync } = require('node:fs')
const { resolve } = require('node:path')

const NORMAL = '#9a8f86'
const ACTIVE = '#6c5ce7'
const OUT_DIR = resolve(__dirname, '../src/assets/tabbar')

// 线性图标 path（viewBox 0 0 48 48，stroke 风格）
const GLYPHS = {
  test: `
    <rect x="9" y="7" width="30" height="34" rx="7" fill="none" stroke="COLOR" stroke-width="3.2"/>
    <circle cx="16.5" cy="17" r="1.8" fill="COLOR"/>
    <line x1="22" y1="17" x2="32" y2="17" stroke="COLOR" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="16.5" cy="25" r="1.8" fill="COLOR"/>
    <line x1="22" y1="25" x2="32" y2="25" stroke="COLOR" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M15 33 l2.5 2.5 5-5" fill="none" stroke="COLOR" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  tarot: `
    <rect x="13" y="7" width="22" height="34" rx="5" fill="none" stroke="COLOR" stroke-width="3.2"/>
    <path d="M24 14 l2.8 7.2 7.2 2.8 -7.2 2.8 -2.8 7.2 -2.8-7.2 -7.2-2.8 7.2-2.8 z" fill="COLOR"/>`,
  records: `
    <circle cx="24" cy="24" r="16" fill="none" stroke="COLOR" stroke-width="3.2"/>
    <path d="M24 15 v9 h8" fill="none" stroke="COLOR" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  me: `
    <circle cx="24" cy="17" r="7.5" fill="none" stroke="COLOR" stroke-width="3.2"/>
    <path d="M10.5 39 c0.5-8 6.5-12 13.5-12 s13 4 13.5 12" fill="none" stroke="COLOR" stroke-width="3.2" stroke-linecap="round"/>`,
}

function svgFor(glyph, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="81" height="81">${GLYPHS[glyph].replaceAll('COLOR', color)}</svg>`
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  for (const glyph of Object.keys(GLYPHS)) {
    for (const [suffix, color] of [['', NORMAL], ['-active', ACTIVE]]) {
      const file = resolve(OUT_DIR, `${glyph}${suffix}.png`)
      writeFileSync(file, await sharp(Buffer.from(svgFor(glyph, color))).png().toBuffer())
      console.log('wrote', file)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
