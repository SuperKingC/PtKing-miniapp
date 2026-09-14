// TinyPNG 压缩测测子品牌栏 v12 + 今日推荐栏 v13（只压一次）。
// 输入 prepared/me-banner-panel-v12.png / prepared/hero-card-v13.png
// 由 rebuild-edges-v13.py 生成。压完必须再跑
//   python rebuild-edges-v13.py --restore-alpha
// 把 prepared 的 alpha / AA 色锁回去。
// 用法：node compress-v13.mjs
//       node compress-v13.mjs hero-card-v13.png
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const prep = path.join(root, 'prepared')
const target = path.resolve(root, '../../src/assets/illus')
for (const line of fs.readFileSync('D:/Mine/miniapp-kit/.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const keys = ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3'].map((n) => process.env[n]).filter(Boolean)

async function shrink(name) {
  const input = fs.readFileSync(path.join(prep, name))
  for (const key of keys) {
    const auth = `Basic ${Buffer.from(`api:${key}`).toString('base64')}`
    const res = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/octet-stream' },
      body: input,
      signal: AbortSignal.timeout(180000),
    })
    if ([401, 429].includes(res.status)) continue
    if (!res.ok) throw new Error(`Shrink HTTP ${res.status}`)
    const { output } = await res.json()
    const out = Buffer.from(await (await fetch(output.url, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(180000),
    })).arrayBuffer())
    if (out.length > 180 * 1024) throw new Error(`${name} over 180KB`)
    fs.writeFileSync(path.join(target, name), out)
    console.log(`${name}: ${input.length} -> ${out.length} bytes`)
    return
  }
  throw new Error('no tinify key available')
}

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['me-banner-panel-v12.png', 'hero-card-v13.png']
for (const name of names) await shrink(name)
