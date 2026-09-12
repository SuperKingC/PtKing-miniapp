// tabbar v18 五组方案生图:v14s generate.mjs 同款链路(STYLE 展开 → kit gen --ref 2K),
// 加 --dry-run 透传(免费校验提示词组装)与 --only <子串...> 定向重生。
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, '../../..')
const kitGen = path.resolve(repo, '../miniapp-kit/art/gen.mjs')
const baseCfg = JSON.parse(fs.readFileSync(path.join(repo, 'art.config.json'), 'utf8'))
baseCfg.compress.tinypngKeyEnv = 'DESIGN_PREVIEW_NO_COMPRESSION' // 候选稿不落包,出图阶段不做 TinyPNG
baseCfg.output.maxTotalMB = 250 // 候选稿不做 TinyPNG,2K 原图 ~3MB/张 × 30
const configPath = path.join(root, 'art.local.config.json')
fs.writeFileSync(configPath, JSON.stringify(baseCfg, null, 2))

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const onlyIdx = argv.indexOf('--only')
const only = onlyIdx >= 0 ? argv.slice(onlyIdx + 1).filter((a) => !a.startsWith('--')) : []

const raw = fs.readFileSync(path.join(root, 'prompts.txt'), 'utf8')
  .split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'))
// 用法:node generate.mjs                      → 生成 prompts.txt 中缺图的条目
//      node generate.mjs --only test-v18a ... → 只生成子串命中条目(已有图也强制重生)
//      node generate.mjs --dry-run            → 只打印组装后的提示词,不出图不花钱
const style = raw.find((l) => l.startsWith('STYLE=')).slice('STYLE='.length)
const items = raw.filter((l) => !l.startsWith('STYLE=')).map((l) => {
  const [name, ...rest] = l.split('|')
  return { name, text: rest.join('|').replace('{STYLE}', style) }
}).filter(({ name }) => only.length === 0 || only.some((o) => name.includes(o)))
const out = path.join(root, 'generated')
fs.mkdirSync(out, { recursive: true })

const missing = items.filter(({ name }) => {
  if (only.length > 0 || dryRun) return true
  const hits = fs.readdirSync(out).filter((f) => new RegExp(`^${name}(_v\\d+)?\\.(png|jpg)$`).test(f))
  const file = hits.at(-1)
  if (!file) return true
  console.log(`${name}: retained (${file}); delete to regenerate`)
  return false
})
if (missing.length === 0) { console.log('all present'); process.exit(0) }
const promptsPath = path.join(root, 'prompts-expanded.local.txt')
fs.writeFileSync(promptsPath, missing.map(({ name, text }) => `${name}|${text}`).join('\n'))
console.log(`${dryRun ? '[dry-run] ' : ''}generating: ${missing.length} 条${dryRun ? '' : ' → ' + missing.slice(0, 6).map((m) => m.name).join(', ') + (missing.length > 6 ? ', …' : '')}`)

// 风格锚点:优先 reference-ui.png(用户三页稿,不入库);缺盘时退本目录的本地锚点(me 品牌栏+今日推荐卡)
const styleRef = path.join(repo, 'miniapp/art/ref-pages-v3/reference-ui.png')
const fallbackRef = path.join(root, 'style-ref.local.jpg')
const refPath = fs.existsSync(styleRef) ? styleRef : fallbackRef
console.log(`[tabbar-v18] style ref: ${path.basename(refPath)}`)

const args = [kitGen, '-c', configPath, '-p', promptsPath, '--out', out, '--size', '2K', '--ref', refPath]
if (dryRun) args.push('--dry-run')
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit', cwd: repo })
  child.on('error', reject)
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`gen exit ${code}`)))
})
