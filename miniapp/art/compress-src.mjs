// 一次性:对 src/assets 内 RGBA32 未量化 PNG 走 TinyPNG 单次压缩(不降分辨率),
// 落盘到升版新文件名(换同路径图片必须升文件名防缓存),不覆盖旧文件。
// 密钥只读 kit 仓库根 .env(TINYPNG_API_KEY / _2.._5),本仓库不落 key。
// 用法: node miniapp/art/compress-src.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const miniRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const kitRoot = path.resolve(miniRoot, '../../miniapp-kit')

const FILES = [
  'src/assets/illus/hero-card-v3.png',
  'src/assets/illus/empty-records-v2.png',
  'src/assets/illus/tile-star-v1.png',
  'src/assets/illus/tile-fun-v2.png',
  'src/assets/illus/tile-love-v3.png',
  'src/assets/illus/tile-mbti-v3.png',
  'src/assets/illus/tile-career-v2.png',
  'src/assets/illus/spot-personality-v2.png',
  'src/assets/illus/spot-love-v2.png',
  'src/assets/illus/spot-career-v2.png',
  'src/assets/illus/spot-fun-v2.png',
  'src/assets/illus/icon-me-clear-v4.png',
  'src/assets/illus/icon-me-haptics-v4.png',
  'src/assets/illus/icon-me-theme-v4.png',
  'src/assets/illus/icon-me-feedback-v4.png',
  'src/assets/illus/icon-me-privacy-v4.png',
  'src/assets/illus/icon-me-share-v4.png',
  'src/assets/tabbar/test-v10s.png',
  'src/assets/tabbar/test-active-v10s.png',
  'src/assets/tabbar/tarot-v10s.png',
  'src/assets/tabbar/tarot-active-v10s.png',
  'src/assets/tabbar/records-v10s.png',
  'src/assets/tabbar/records-active-v10s.png',
  'src/assets/tabbar/me-v10s.png',
  'src/assets/tabbar/me-active-v10s.png',
]

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

function tinifyKeys() {
  return ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3', 'TINYPNG_API_KEY_4', 'TINYPNG_API_KEY_5']
    .map((n) => process.env[n]?.trim())
    .filter(Boolean)
}

async function tinifyCompress(buf, keys, dead) {
  for (const key of keys) {
    if (dead.has(key)) continue
    const auth = `Basic ${Buffer.from(`api:${key}`).toString('base64')}`
    const post = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/octet-stream' },
      body: buf,
      signal: AbortSignal.timeout(120_000),
    })
    if (post.status === 401 || post.status === 429) { dead.add(key); continue }
    if (!post.ok) throw new Error(`TinyPNG HTTP ${post.status}: ${(await post.text()).slice(0, 200)}`)
    const { output } = await post.json()
    const out = Buffer.from(await (await fetch(output.url, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(120_000),
    })).arrayBuffer())
    return out
  }
  throw new Error('TinyPNG 所有 key 均不可用')
}

function isRgba32Png(buf) {
  if (buf.length < 26 || buf.toString('ascii', 1, 4) !== 'PNG') return false
  return buf[25] === 6 // IHDR colorType 6 = RGBA 全彩(未走 TinyPNG 量化)
}

function bumpVersion(name) {
  const m = name.match(/^(.*-v)(\d+)([a-z]?)(\.png)$/)
  if (!m) throw new Error(`无法升版: ${name}`)
  return `${m[1]}${+m[2] + 1}${m[3]}${m[4]}`
}

loadDotEnv(path.join(kitRoot, '.env'))
const keys = tinifyKeys()
if (keys.length === 0) {
  console.error('[compress-src] 缺少 TINYPNG_API_KEY,写在 kit 仓库根 .env')
  process.exit(1)
}

const dead = new Set()
const mapping = []
let next = 0

async function worker() {
  while (next < FILES.length) {
    const rel = FILES[next++]
    const full = path.join(miniRoot, rel)
    const before = fs.readFileSync(full)
    if (!isRgba32Png(before)) {
      console.log(`  ${rel}  非 RGBA32,跳过(已量化?)`)
      continue
    }
    const out = await tinifyCompress(before, keys, dead)
    if (out.length >= before.length * 0.98) {
      console.log(`  ${rel}  收益<2%,已是压缩产物,不写 ${(before.length / 1024).toFixed(0)}KB`)
      continue
    }
    const base = path.basename(rel)
    const newRel = rel.replace(base, bumpVersion(base))
    fs.writeFileSync(path.join(miniRoot, newRel), out)
    mapping.push({ old: rel, new: newRel, before: before.length, after: out.length })
    console.log(`  ${rel}  ${(before.length / 1024).toFixed(0)}KB → ${path.basename(newRel)} ${(out.length / 1024).toFixed(0)}KB`)
    if (out.length > 180 * 1024) console.warn(`  !! ${path.basename(newRel)} 超 180KB`)
  }
}

console.log(`[compress-src] ${FILES.length} 张,不降分辨率,TinyPNG 一次`)
await Promise.all(Array.from({ length: Math.min(3, FILES.length) }, () => worker()))
const saved = mapping.reduce((a, m) => a + (m.before - m.after), 0)
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'compress-src-result.local.json'), JSON.stringify(mapping, null, 2))
console.log(`[compress-src] 落盘 ${mapping.length} 张,共少 ${(saved / 1024).toFixed(0)}KB,映射已写 compress-src-result.local.json`)
