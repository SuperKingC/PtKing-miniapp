// 一次性：TinyPNG 单压 prepared 里指定文件 → 落 src/assets/illus 升版文件名
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
const jobs = [
  { prepared: 'hero-card-v5.png', dest: 'hero-card-v5.png' },
]
for (const job of jobs) {
  const input = fs.readFileSync(path.join(root, 'prepared', job.prepared))
  let done = false
  for (const key of keys) {
    const auth = `Basic ${Buffer.from(`api:${key}`).toString('base64')}`
    const res = await fetch('https://api.tinify.com/shrink', { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/octet-stream' }, body: input, signal: AbortSignal.timeout(120000) })
    if ([401, 429].includes(res.status)) continue
    if (!res.ok) throw new Error(`Shrink HTTP ${res.status}`)
    const { output } = await res.json()
    const out = Buffer.from(await (await fetch(output.url, { headers: { Authorization: auth }, signal: AbortSignal.timeout(120000) })).arrayBuffer())
    if (out.length > 180 * 1024) throw new Error(`${job.dest} over 180KB`)
    fs.writeFileSync(path.join(srcRoot, job.dest), out)
    console.log(`${job.dest}: ${input.length} -> ${out.length} bytes`)
    done = true
    break
  }
  if (!done) throw new Error('no tinify key available')
}
