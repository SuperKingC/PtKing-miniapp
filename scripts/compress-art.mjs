#!/usr/bin/env node
/**
 * 对已有静态图做一次 TinyPNG，不改像素尺寸、不升文件名。
 * 密钥只读 kit 仓库根 .env（TINYPNG_API_KEY / _2.._5），本仓库不落 key。
 *
 * 默认只压 art/generated-art/tarot，不改像素、不升文件名。
 * 用法: npm run assets:compress
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const kitRoot = process.env.MINIAPP_KIT_DIR
  ? path.resolve(process.env.MINIAPP_KIT_DIR)
  : path.resolve(root, '../miniapp-kit')
const assetDir = path.join(root, 'art', 'generated-art', 'tarot')

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

function collectImages(dir, base = '') {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const rel = base ? `${base}/${name}` : name
    if (fs.statSync(full).isDirectory()) out.push(...collectImages(full, rel))
    else if (/\.(jpe?g|png)$/i.test(name)) out.push({ full, rel, size: fs.statSync(full).size })
  }
  return out
}

function tinifyKeys() {
  return ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3', 'TINYPNG_API_KEY_4', 'TINYPNG_API_KEY_5']
    .map((n) => process.env[n]?.trim())
    .filter(Boolean)
}

async function tinifyCompress(buf, keys, dead, stats) {
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
    const count = post.headers.get('compression-count')
    if (count) stats.compressionCount = +count
    const { output } = await post.json()
    const out = Buffer.from(await (await fetch(output.url, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(120_000),
    })).arrayBuffer())
    if (out.length >= buf.length * 0.98) return { buf, compressed: false }
    return { buf: out, compressed: true }
  }
  throw new Error('TinyPNG 所有 key 均不可用')
}

loadDotEnv(path.join(kitRoot, '.env'))
const keys = tinifyKeys()
if (keys.length === 0) {
  console.error('[compress] 缺少 TINYPNG_API_KEY。写在 kit 仓库根 .env')
  process.exit(1)
}

const files = collectImages(assetDir)
if (files.length === 0) {
  console.error(`[compress] ${assetDir} 里没有 jpg/png`)
  process.exit(1)
}

const dead = new Set()
const stats = { compressionCount: null }
let saved = 0
let next = 0

async function worker() {
  while (next < files.length) {
    const item = files[next++]
    const before = fs.readFileSync(item.full)
    const result = await tinifyCompress(before, keys, dead, stats)
    if (result.compressed) {
      fs.writeFileSync(item.full, result.buf)
      saved += before.length - result.buf.length
      console.log(`  ${item.rel}  ${(before.length / 1024).toFixed(0)}KB → ${(result.buf.length / 1024).toFixed(0)}KB`)
    } else {
      console.log(`  ${item.rel}  收益<2%，保留 ${(before.length / 1024).toFixed(0)}KB`)
    }
  }
}

console.log(`[compress] ${files.length} 张，不降分辨率，TinyPNG 一次`)
await Promise.all(Array.from({ length: Math.min(3, files.length) }, () => worker()))
console.log(`[compress] 共少 ${(saved / 1024).toFixed(0)}KB${stats.compressionCount != null ? `；TinyPNG 本月已用 ${stats.compressionCount} 张` : ''}`)
