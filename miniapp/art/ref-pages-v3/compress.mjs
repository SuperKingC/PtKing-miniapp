import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { fileURLToPath } from 'node:url'

// prepared/ → TinyPNG 单次压缩（透明 PNG 直压；tarot-hero-v2 转 JPEG）→ 落 miniapp/src/assets/illus
const root = path.dirname(fileURLToPath(import.meta.url))
const target = path.resolve(root, '../../src/assets/illus')
for (const line of fs.readFileSync('D:/Mine/miniapp-kit/.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const keys = ['TINYPNG_API_KEY', 'TINYPNG_API_KEY_2', 'TINYPNG_API_KEY_3'].map(name => process.env[name]).filter(Boolean)
const jobs = [
  { name: 'hero-card-v2.png', source: 'hero-card-v1.png' },
  { name: 'tile-mbti-v3.png' },
  { name: 'tile-love-v3.png' },
  { name: 'tile-star-v1.png' },
  { name: 'tile-career-v2.png' },
  { name: 'tile-fun-v2.png' },
  { name: 'icon-bell-v2.png' },
  { name: 'tarot-panel-v2.jpg', source: 'tarot-panel-v1.png', convert: true },
  { name: 'tarot-card-single-v3.png' },
  { name: 'tarot-cards-fan-v3.png' },
  { name: 'records-book-v4.png' },
]
const statePath = path.join(root, 'compression-state.local.json')
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath)) : {}
function download(url, auth, convert) {
  return new Promise((resolve, reject) => {
    const body = convert ? JSON.stringify({ convert: { type: 'image/jpeg' } }) : null
    const request = https.request(url, { method: body ? 'POST' : 'GET', headers: { Authorization: auth, ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}) }, agent: false }, response => {
      const chunks = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('aborted', () => reject(new Error('Download aborted')))
      response.on('error', reject)
      response.on('end', () => response.statusCode === 200 ? resolve(Buffer.concat(chunks)) : reject(new Error(`Download HTTP ${response.statusCode}`)))
    })
    request.setTimeout(90000, () => request.destroy(new Error('Download timed out')))
    request.on('error', reject)
    request.end(body)
  })
}
for (const job of jobs) {
  if (state[job.name]?.completed) { console.log(`${job.name}: already completed`); continue }
  const sourceName = job.source ?? job.name
  const input = fs.readFileSync(path.join(root, 'prepared', sourceName.startsWith('tarot-panel') ? path.join('refcrop', sourceName.replace('-v2.jpg','-v1.png')) : path.join('refcrop', sourceName.replace('-v2.png','-v1.png').replace('-v3.png','-v1.png').replace('-v4.png','-v2.png'))))
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
