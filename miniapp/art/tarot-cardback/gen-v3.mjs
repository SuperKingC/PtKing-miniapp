/**
 * 牌背 v3 单张直出：先走 Gemini（更快），失败再 gpt。
 * 生图成功立刻落盘，压缩失败也不丢原图。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'art.config.json'), 'utf8'))
const promptFile = path.join(root, 'art/prompts-tarot-cardback-v3a.txt')
const outDir = path.join(root, 'art/generated-art/tarot-cardback-v3')
const promptLine = fs.readFileSync(promptFile, 'utf8').split(/\r?\n/).find((line) => line.includes('|'))
const promptText = promptLine.split('|').slice(1).join('|').trim()
const fullPrompt = `${cfg.style}, ${promptText}. 画面中禁止:${(cfg.prompt?.bans ?? []).join('、')}`
const models = [
  'google/gemini-3.1-flash-image-preview',
  'google/gemini-3-pro-image-preview',
  'openai/gpt-5.4-image-2',
]
const key = process.env[cfg.api.keyEnv]
if (!key) {
  console.error(`[gen-v3] 缺少 ${cfg.api.keyEnv}`)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })
console.log(`[gen-v3] 开始 ${new Date().toISOString()}`)
console.log(`[gen-v3] 提示词 ${fullPrompt.slice(0, 80)}...`)

async function generate(model) {
  const body = {
    model,
    messages: [{ role: 'user', content: fullPrompt }],
    modalities: ['image', 'text'],
  }
  if (/^openai\//.test(model) && /image/.test(model)) {
    body.image_config = { aspect_ratio: '2:3', image_size: '2K' }
  }
  const controller = new AbortController()
  const t0 = Date.now()
  const timer = setTimeout(() => controller.abort(new Error(`timeout-240s:${model}`)), 240_000)
  const heartbeat = setInterval(() => {
    console.log(`[gen-v3] 仍在请求 ${model} ${Math.round((Date.now() - t0) / 1000)}s`)
  }, 20_000)
  try {
    const res = await fetch(`${cfg.api.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const raw = await res.text()
    let data = {}
    try { data = JSON.parse(raw) } catch { data = { raw: raw.slice(0, 400) } }
    if (!res.ok || data.error) {
      throw new Error(`${model} HTTP ${res.status}: ${JSON.stringify(data.error || data).slice(0, 400)}`)
    }
    const images = [...new Set((data.choices?.[0]?.message?.images ?? [])
      .map((im) => im?.image_url?.url)
      .filter((u) => typeof u === 'string' && /^data:image\/\w+;base64,/.test(u)))]
    if (images.length === 0) {
      throw new Error(`${model} 未返回图片: ${JSON.stringify(data.choices?.[0]?.message ?? {}).slice(0, 300)}`)
    }
    return { images, cost: data.usage?.cost ?? 0, elapsed: Math.round((Date.now() - t0) / 1000) }
  } finally {
    clearTimeout(timer)
    clearInterval(heartbeat)
  }
}

let lastError = null
for (const model of models) {
  try {
    console.log(`[gen-v3] 尝试 ${model}`)
    const result = await generate(model)
    const dataUrl = result.images[0]
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/s)
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
    const dest = path.join(outDir, `tarot-clay-cardback-v3a.${ext}`)
    fs.writeFileSync(dest, Buffer.from(match[2], 'base64'))
    console.log(`[gen-v3] 成功 ${model} ${dest} ${(fs.statSync(dest).size / 1024).toFixed(0)}KB ${result.elapsed}s $${result.cost}`)
    process.exit(0)
  } catch (error) {
    lastError = error
    console.warn(`[gen-v3] ${model} 失败: ${error.message}`)
  }
}

console.error(`[gen-v3] 全部失败: ${lastError?.message}`)
process.exit(1)
