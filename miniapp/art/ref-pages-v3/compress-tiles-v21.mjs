// 一次性：TinyPNG 压缩 v21 两枚 tile（prepared/ → src/assets/illus，升版文件名）
// v21 把气球/公文包的下/左接触棱重建为与参考稿（爱心/星星/MBTI）同族：参考稿的边是
// 一圈内翻软陶棱（自视觉边向内 ~11px 压出暖褐接触棱），v20 的影却铺在实体外侧且方向相反，
// 又有一块近白平板与 78/198 两级台阶导致的锯齿。v21 用光滑圆角矩形轮廓重出 alpha、
// 按参考实测剖面重绘下/左棱。
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
const files = ['tile-fun-v21.png', 'tile-career-v21.png']
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
