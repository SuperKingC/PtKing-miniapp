import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// 参考图批次驱动：展开 prompts-en.txt 的 {STYLE} 占位符 → 临时配置(放开文字禁则/关压缩/放大限额)
// → 调 kit gen.mjs，全部带 reference-ui.png 作 i2i 参考图。已有产物跳过，删掉产物可强制重生成。
const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, '../../..')
const kitGen = path.resolve(repo, '../miniapp-kit/art/gen.mjs')
const baseCfg = JSON.parse(fs.readFileSync(path.join(repo, 'art.config.json'), 'utf8'))
baseCfg.compress.tinypngKeyEnv = 'DESIGN_PREVIEW_NO_COMPRESSION' // 生成期不压，落包前统一压缩
baseCfg.prompt.bans = baseCfg.prompt.bans.filter((b) => !/文字|字母|数字/.test(b)) // MBTI 字母牌需要
baseCfg.output.maxTotalMB = 60
const configPath = path.join(root, 'art.local.config.json')
fs.writeFileSync(configPath, JSON.stringify(baseCfg, null, 2))

const raw = fs.readFileSync(path.join(root, 'prompts-en.txt'), 'utf8')
  .split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'))
const style = raw.find((l) => l.startsWith('STYLE=')).slice('STYLE='.length)
const items = raw.filter((l) => !l.startsWith('STYLE=')).map((l) => {
  const [name, ...rest] = l.split('|')
  return { name, text: rest.join('|').replace('{STYLE}', style) }
})
const out = path.join(root, 'generated')
fs.mkdirSync(out, { recursive: true })

const missing = items.filter(({ name }) => {
  const hits = fs.readdirSync(out).filter((f) => new RegExp(`^${name}(_v\\d+)?\\.(png|jpg|jpeg|webp)$`).test(f))
  const file = hits.at(-1)
  if (!file) return true
  if (fs.statSync(path.join(out, file)).size === 0) throw new Error(`${name}: existing output is empty; inspect before regenerating`)
  console.log(`${name}: existing original retained (${file}); skipping generation`)
  return false
})
if (missing.length === 0) { console.log('all assets present; nothing to generate'); process.exit(0) }

const promptsPath = path.join(root, 'prompts-expanded.local.txt')
fs.writeFileSync(promptsPath, missing.map(({ name, text }) => `${name}|${text}`).join('\n'))
console.log(`generating: ${missing.map((m) => m.name).join(', ')}`)

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [kitGen, '-c', configPath, '-p', promptsPath, '--out', out, '--ref', path.join(root, 'reference-ui.png')], { stdio: 'inherit', cwd: repo })
  child.on('error', reject)
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`gen exit ${code}`)))
})
