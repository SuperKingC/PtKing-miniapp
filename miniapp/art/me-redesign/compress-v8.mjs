import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// v8 批:几何蒙版透明横幅 + BEN2 重抠 6 图标 → TinyPNG 单压 → 落 src/assets/illus 升版名
// (模式复用 compress-ref.mjs:state 断点续跑,每张只压一次,180KB 红线)
const root = path.dirname(fileURLToPath(import.meta.url))
const target = path.resolve(root, '../../src/assets/illus')
for (const line of fs.readFileSync('D:/Mine/miniapp-kit/.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const keys = ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3'].map(name => process.env[name]).filter(Boolean)
const jobs = [
  { name: 'me-banner-panel-v4.png', source: 'me-banner-panel-v4-src.png' },
  { name: 'icon-me-clear-v8.png', source: 'ref-clear-ben2.png' },
  { name: 'icon-me-privacy-v8.png', source: 'ref-privacy-ben2.png' },
  { name: 'icon-me-share-v8.png', source: 'ref-share-ben2.png' },
  { name: 'icon-me-feedback-v8.png', source: 'ref-feedback-ben2.png' },
  { name: 'icon-me-theme-v8.png', source: 'ref-theme-ben2.png' },
  { name: 'icon-me-haptics-v8.png', source: 'ref-haptics-ben2.png' },
]
const statePath = path.join(root, 'compression-state.local.json')
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
  console.log(`${job.name}: ${input.length} -> ${output.length} bytes, written to src/assets/illus`)
}
