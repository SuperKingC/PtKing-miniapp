// TinyPNG 压缩 v35 两枚 tile（prepared/ → src/assets/illus）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.resolve(root, '../../src/assets/illus')
for (const line of fs.readFileSync('D:/Mine/miniapp-kit/.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
}

const keys = ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3']
  .map((name) => process.env[name])
  .filter(Boolean)
const files = ['tile-fun-v35.png', 'tile-career-v35.png']

for (const name of files) {
  const input = fs.readFileSync(path.join(root, 'prepared', name))
  let done = false
  for (const key of keys) {
    const auth = `Basic ${Buffer.from(`api:${key}`).toString('base64')}`
    const response = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/octet-stream' },
      body: input,
      signal: AbortSignal.timeout(120000),
    })
    if ([401, 429].includes(response.status)) continue
    if (!response.ok) throw new Error(`Shrink HTTP ${response.status}`)
    const { output } = await response.json()
    const downloaded = await fetch(output.url, { headers: { Authorization: auth }, signal: AbortSignal.timeout(120000) })
    if (!downloaded.ok) throw new Error(`Download HTTP ${downloaded.status}`)
    const out = Buffer.from(await downloaded.arrayBuffer())
    if (out.length > 180 * 1024) throw new Error(`${name} over 180KB`)
    fs.writeFileSync(path.join(srcRoot, name), out)
    console.log(`${name}: ${input.length} -> ${out.length} bytes`)
    done = true
    break
  }
  if (!done) throw new Error('no available TinyPNG key')
}
