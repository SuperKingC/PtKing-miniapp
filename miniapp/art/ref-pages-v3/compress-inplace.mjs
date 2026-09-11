// TinyPNG 单压 src 里的指定文件（原地）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.resolve(root, '../../src/assets/illus')
for (const line of fs.readFileSync('D:/Mine/miniapp-kit/.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const keys = ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3'].map((n) => process.env[n]).filter(Boolean)
const files = ['tile-star-v6.png', 'tile-love-v6.png', 'tile-mbti-v7.png', 'tile-fun-v7.png']
for (const name of files) {
  const dest = path.join(srcRoot, name)
  const input = fs.readFileSync(dest)
  for (const key of ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3'].map((n) => process.env[n]).filter(Boolean)) {
    const auth = `Basic ${Buffer.from(`api:${key}`).toString('base64')}`
    const res = await fetch('https://api.tinify.com/shrink', { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/octet-stream' }, body: input, signal: AbortSignal.timeout(120000) })
    if ([401, 429].includes(res.status)) continue
    if (!res.ok) throw new Error(`Shrink HTTP ${res.status}`)
    const { output } = await res.json()
    const out = Buffer.from(await (await fetch(output.url, { headers: { Authorization: auth }, signal: AbortSignal.timeout(120000) })).arrayBuffer())
    if (out.length > 180 * 1024) throw new Error(`${name} over 180KB`)
    fs.writeFileSync(dest, out)
    console.log(`${name}: ${input.length} -> ${out.length} bytes`)
    break
  }
}
