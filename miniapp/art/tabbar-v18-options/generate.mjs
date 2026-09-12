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
baseCfg.output.maxTotalMB = 400 // v6 后总量已超 250MB(候选不做 TinyPNG,2K 原图 ~3MB/张)
const configPath = path.join(root, 'art.local.config.json')
fs.writeFileSync(configPath, JSON.stringify(baseCfg, null, 2))

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const onlyIdx = argv.indexOf('--only')
const only = onlyIdx >= 0 ? argv.slice(onlyIdx + 1).filter((a) => !a.startsWith('--')) : []
const promptsIdx = argv.indexOf('--prompts')
const promptsFile = path.join(root, promptsIdx >= 0 ? argv[promptsIdx + 1] : 'prompts.txt')

const raw = fs.readFileSync(promptsFile, 'utf8')
  .split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'))
// 用法:node generate.mjs                      → 生成 prompts.txt 中缺图的条目
//      node generate.mjs --prompts x.txt      → 换一批提示词(如重生的猫坐姿)
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

// 参考图:①风格锚。reference-ui.png(用户三页稿,不入库)优先,缺盘退本地 style-ref.local.jpg;
//        ②角色锚(可选,--char 指定,如猫坐姿重生用的 hero-card 裁切)——kit 上限 2 张。
const styleRef = path.join(repo, 'miniapp/art/ref-pages-v3/reference-ui.png')
const fallbackRef = path.join(root, 'style-ref.local.jpg')
const refPath = fs.existsSync(styleRef) ? styleRef : fallbackRef
const charIdx = argv.indexOf('--char')
const refs = [refPath]
if (charIdx >= 0) refs.push(path.join(root, argv[charIdx + 1]))
console.log(`[tabbar-v18] refs: ${refs.map((r) => path.basename(r)).join(' + ')}`)

const args = [kitGen, '-c', configPath, '-p', promptsPath, '--out', out, '--size', '2K', '--ref', refs.join(',')]
if (dryRun) args.push('--dry-run')
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit', cwd: repo })
  child.on('error', reject)
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`gen exit ${code}`)))
})
