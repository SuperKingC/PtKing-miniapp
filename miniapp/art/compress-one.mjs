// 一次性:单张 PNG 走 TinyPNG 压缩(不降分辨率),落升版文件名。
// 密钥只读 kit 仓库根 .env,本仓库不落 key。
// 用法: node miniapp/art/compress-one.mjs <srcPath> <dstPath>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const miniRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const kitRoot = path.resolve(miniRoot, '../../miniapp-kit')

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
loadDotEnv(path.join(kitRoot, '.env'))

const src = process.argv[2]
const dst = process.argv[3]
if (!src || !dst) { console.error('usage: node compress-one.mjs <src> <dst>'); process.exit(1) }

const KEYS = ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3', 'TINYPNG_API_KEY_4', 'TINYPNG_API_KEY_5']
  .map((k) => process.env[k]).filter(Boolean)

async function tinify(key, input) {
  const res = await fetch('https://api.tinify.com/shrink', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`api:${key}`).toString('base64')}`, 'Content-Type': 'image/png' },
    body: input,
  })
  if (!res.ok) throw new Error(`tinify ${res.status}: ${await res.text()}`)
  const loc = res.headers.get('location')
  if (!loc) throw new Error('no location header')
  const out = await fetch(loc)
  return Buffer.from(await out.arrayBuffer())
}

const input = fs.readFileSync(src)
let lastErr
for (const key of KEYS) {
  try {
    const out = await tinify(key, input)
    fs.writeFileSync(dst, out)
    console.log(`ok ${dst} ${input.length} -> ${out.length} bytes`)
    process.exit(0)
  } catch (e) {
    console.log(`key ${key.slice(0, 8)}… failed: ${e.message}`)
    lastErr = e
  }
}
console.error('ALL KEYS FAILED', lastErr.message)
process.exit(2)
