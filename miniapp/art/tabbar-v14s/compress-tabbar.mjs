// tabbar v13s 落包:prepared/ → TinyPNG(PNG8 量化,透明 PNG 直压)→ 升名 src/assets/tabbar/
// 沿用 compress-src.mjs 的 TinyPNG 路子;prepared 名已带 -v13s,落包名直接用,不二次升版。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const miniRoot = path.resolve(root, '../..')
const kitRoot = path.resolve(miniRoot, '../../miniapp-kit')
const TARGET = path.join(miniRoot, 'src/assets/tabbar')

const NAMES = [
  'icon-tab-test-v14s.png',
  'icon-tab-test-active-v14s.png',
  'icon-tab-tarot-v14s.png',
  'icon-tab-tarot-active-v14s.png',
  'icon-tab-records-v14s.png',
  'icon-tab-records-active-v14s.png',
  'icon-tab-me-v14s.png',
  'icon-tab-me-active-v14s.png',
]

for (const line of fs.readFileSync(path.join(kitRoot, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const keys = ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3', 'TINYPNG_API_KEY_4', 'TINYPNG_API_KEY_5']
  .map((n) => process.env[n]?.trim()).filter(Boolean)
if (keys.length === 0) {
  console.error('[compress-tabbar] 缺少 TINYPNG_API_KEY,写在 kit 仓库根 .env')
  process.exit(1)
}

async function tinify(buf) {
  const dead = new Set()
  for (const key of keys) {
    if (dead.has(key)) continue
    const auth = `Basic ${Buffer.from(`api:${key}`).toString('base64')}`
    const post = await fetch('https://api.tinify.com/shrink', {
      method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/octet-stream' },
      body: buf, signal: AbortSignal.timeout(120_000),
    })
    if (post.status === 401 || post.status === 429) { dead.add(key); continue }
    if (!post.ok) throw new Error(`TinyPNG HTTP ${post.status}: ${(await post.text()).slice(0, 200)}`)
    const { output } = await post.json()
    return Buffer.from(await (await fetch(output.url, { headers: { Authorization: auth }, signal: AbortSignal.timeout(120_000) })).arrayBuffer())
  }
  throw new Error('TinyPNG 所有 key 均不可用')
}

let next = 0
async function worker() {
  while (next < NAMES.length) {
    const name = NAMES[next++]
    const src = path.join(root, 'prepared', name)
    const before = fs.readFileSync(src)
    const out = await tinify(before)
    if (out.length > 180 * 1024) throw new Error(`${name} 压缩后仍超 180KB: ${(out.length / 1024).toFixed(0)}KB`)
    fs.writeFileSync(path.join(TARGET, name), out)
    console.log(`  ${name}: ${(before.length / 1024).toFixed(0)}KB -> ${(out.length / 1024).toFixed(0)}KB`)
  }
}

await Promise.all(Array.from({ length: Math.min(3, NAMES.length) }, () => worker()))
console.log(`[compress-tabbar] ${NAMES.length} 枚落包完成 -> src/assets/tabbar/`)
