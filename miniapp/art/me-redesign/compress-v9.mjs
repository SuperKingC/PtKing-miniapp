import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// v9 批:clean-icon-fringe.py 去污+预乘缩放的 6 图标 → TinyPNG 单压 → 同名覆盖 icon-me-*-v8.png
// (包内图同名覆盖规则:开发者工具清「全部缓存」后重编译即可,不必升名;state 独立文件避免与 v8 批撞键)
const root = path.dirname(fileURLToPath(import.meta.url))
const target = path.resolve(root, '../../src/assets/illus')
for (const line of fs.readFileSync('D:/Mine/miniapp-kit/.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const keys = ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3'].map(name => process.env[name]).filter(Boolean)
const jobs = [
  { name: 'icon-me-clear-v8.png', source: 'ref-clear-defringe.png' },
  { name: 'icon-me-privacy-v8.png', source: 'ref-privacy-defringe.png' },
  { name: 'icon-me-share-v8.png', source: 'ref-share-defringe.png' },
  { name: 'icon-me-feedback-v8.png', source: 'ref-feedback-defringe.png' },
  { name: 'icon-me-theme-v8.png', source: 'ref-theme-defringe.png' },
  { name: 'icon-me-haptics-v8.png', source: 'ref-haptics-defringe.png' },
]
const statePath = path.join(root, 'compression-v9.local.json')
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath)) : {}
async function download(url, auth) {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: auth },
    signal: AbortSignal.timeout(120000),
  })
  if (!response.ok) throw new Error(`Download HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}
for (const job of jobs) {
  if (state[job.name]?.completed) { console.log(`${job.name}: already completed`); continue }
  const input = fs.readFileSync(path.join(root, 'prepared', 'final', job.source))
  let auth
  if (!state[job.name]) {
    for (let index = 0; index < keys.length; index++) {
      auth = `Basic ${Buffer.from(`api:${keys[index]}`).toString('base64')}`
      const response = await fetch('https://api.tinify.com/shrink', { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/octet-stream' }, body: input, signal: AbortSignal.timeout(120000) })
      if ([401, 429].includes(response.status)) continue
      if (!response.ok) throw new Error(`Shrink HTTP ${response.status}`)
      const result = await response.json()
      state[job.name] = { url: result.output.url, keyIndex: index, before: input.length }
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
      console.log(`${job.name}: single TinyPNG shrink accepted`)
      break
    }
  }
  if (!state[job.name]) throw new Error('No available TinyPNG key')
  auth = `Basic ${Buffer.from(`api:${keys[state[job.name].keyIndex]}`).toString('base64')}`
  let output
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { output = await download(state[job.name].url, auth); break }
    catch (error) { console.log(`${job.name}: download attempt ${attempt}: ${error.message}`); if (attempt === 3) throw error }
  }
  if (output.length > 180 * 1024) throw new Error(`${job.name}: exceeds 180KB: ${output.length}`)
  fs.writeFileSync(path.join(target, job.name), output)
  state[job.name].completed = true
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
  console.log(`${job.name}: ${input.length} -> ${output.length} bytes, overwritten in src/assets/illus`)
}
