// 落地「塔罗」两枚候选 A 方向(prepared/icon-tab-tarot[-active]-v18a.png)→ 包内 TinyPNG。
// 用户指令(2026-09-12):塔罗用 A,其它 tab 不变 —— 故只落这两枚。
// 换同路径图片必须升文件名防缓存:v17s → v18s(其余 6 枚仍是 v17s,动它们才算改)。
// 用法:node land-tarot-a.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const miniRoot = path.resolve(root, '../..')
const kitRoot = path.resolve(miniRoot, '../../miniapp-kit')
const TARGET = path.join(miniRoot, 'src/assets/tabbar')

const JOBS = [
  ['prepared/icon-tab-tarot-v18a.png', 'icon-tab-tarot-v18s.png'],
  ['prepared/icon-tab-tarot-active-v18a.png', 'icon-tab-tarot-active-v18s.png'],
]

for (const line of fs.readFileSync(path.join(kitRoot, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const keys = ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3', 'TINYPNG_API_KEY_4', 'TINYPNG_API_KEY_5']
  .map((n) => process.env[n]?.trim()).filter(Boolean)
if (keys.length === 0) { console.error('[land-tarot-a] 缺少 TINYPNG_API_KEY(kit 仓库根 .env)'); process.exit(1) }

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

for (const [src, name] of JOBS) {
  const before = fs.readFileSync(path.join(root, src))
  const out = await tinify(before)
  if (out.length > 180 * 1024) throw new Error(`${name} 压缩后仍超 180KB: ${(out.length / 1024).toFixed(0)}KB`)
  fs.writeFileSync(path.join(TARGET, name), out)
  console.log(`  ${name}: ${(before.length / 1024).toFixed(0)}KB -> ${(out.length / 1024).toFixed(0)}KB`)
}
console.log(`[land-tarot-a] 2 枚落包完成 -> src/assets/tabbar/(v18s)`)
