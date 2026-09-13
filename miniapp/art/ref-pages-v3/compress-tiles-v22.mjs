// 一次性：TinyPNG 压缩 v22 两枚 tile（prepared/ → src/assets/illus，升版文件名）
// v22 在 v21 基础上：① 棱权重 k≤16 全力（v21 从边缘线性衰减，最深 k≈11 只剩 ~56% 力度，
// 峰值 92 对参考 105~114，棱发虚）；② 暗棱改乘性比率（clamp ≤1.02 只允许压暗），
// 修掉 v21「参考色+板面偏移」把公文包棱染成脏紫灰的问题；③ 乘 base0（透明缝隙已垫
// 板面色），修掉首版左缘黑洞。
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
const files = ['tile-fun-v22.png', 'tile-career-v22.png']
for (const name of files) {
  const input = fs.readFileSync(path.join(root, 'prepared', name))
  let done = false
  for (const key of keys) {
    const auth = `Basic ${Buffer.from(`api:${key}`).toString('base64')}`
    const res = await fetch('https://api.tinify.com/shrink', { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/octet-stream' }, body: input, signal: AbortSignal.timeout(120000) })
    if ([401, 429].includes(res.status)) continue
    if (!res.ok) throw new Error(`Shrink HTTP ${res.status}`)
    const { output } = await res.json()
    const out = Buffer.from(await (await fetch(output.url, { headers: { Authorization: auth }, signal: AbortSignal.timeout(120000) })).arrayBuffer())
    if (out.length > 180 * 1024) throw new Error(`${name} over 180KB`)
    fs.writeFileSync(path.join(srcRoot, name), out)
    console.log(`${name}: ${input.length} -> ${out.length} bytes`)
    done = true
    break
  }
  if (!done) throw new Error('no tinify key available')
}
