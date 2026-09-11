import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { fileURLToPath } from 'node:url'

// prepared/ → TinyPNG 单次压缩（横幅转 JPEG）→ 落 miniapp/src/assets/illus
const root = path.dirname(fileURLToPath(import.meta.url))
const target = path.resolve(root, '../../src/assets/illus')
for (const line of fs.readFileSync('D:/Mine/miniapp-kit/.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const keys = ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3'].map(name => process.env[name]).filter(Boolean)
const jobs = [
  { name: 'me-banner-transparent-v5.png', source: 'me-banner-v5.png' },
  { name: 'icon-me-clear-v5.png' },
  { name: 'icon-me-privacy-v5.png' },
  { name: 'icon-me-share-v5.png' },
  { name: 'icon-me-feedback-v5.png' },
  { name: 'icon-me-theme-v5.png' },
  { name: 'icon-me-haptics-v5.png' },
]
const statePath = path.join(root, 'compression-state.local.json')
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath)) : {}
async function download(url, auth, convert) {
  const response = await fetch(url, {
    method: convert ? 'POST' : 'GET',
    headers: { Authorization: auth, ...(convert ? { 'Content-Type': 'application/json' } : {}) },
    body: convert ? JSON.stringify({ convert: { type: 'image/jpeg' } }) : undefined,
    signal: AbortSignal.timeout(120000),
  })
  if (response.statusCode === 400) throw new Error(`Download HTTP 400`)
  if (!response.ok) throw new Error(`Download HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}
for (const job of jobs) {
  if (state[job.name]?.completed) { console.log(`${job.name}: already completed`); continue }
  const input = fs.readFileSync(path.join(root, 'prepared', 'final', job.source ?? job.name))
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
    try { output = await download(state[job.name].url, auth, job.convert); break }
    catch (error) { console.log(`${job.name}: download attempt ${attempt}: ${error.message}`); if (attempt === 3) throw error }
  }
  if (output.length > 180 * 1024) throw new Error(`${job.name}: exceeds 180KB: ${output.length}`)
  fs.writeFileSync(path.join(target, job.name), output)
  state[job.name].completed = true
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
  console.log(`${job.name}: ${input.length} -> ${output.length} bytes, written to src/assets/illus`)
}
