// tabbar v14s 正式资产驱动:展开 STYLE → kit gen(--ref reference-ui.png, 2K 出图)
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, '../../..')
const kitGen = path.resolve(repo, '../miniapp-kit/art/gen.mjs')
const baseCfg = JSON.parse(fs.readFileSync(path.join(repo, 'art.config.json'), 'utf8'))
baseCfg.compress.tinypngKeyEnv = 'DESIGN_PREVIEW_NO_COMPRESSION' // 落包前统一走 prepare 阶段压缩
baseCfg.output.maxTotalMB = 40
const configPath = path.join(root, 'art.local.config.json')
fs.writeFileSync(configPath, JSON.stringify(baseCfg, null, 2))

const raw = fs.readFileSync(path.join(root, 'prompts.txt'), 'utf8')
  .split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'))
const style = raw.find((l) => l.startsWith('STYLE=')).slice('STYLE='.length)
const items = raw.filter((l) => !l.startsWith('STYLE=')).map((l) => {
  const [name, ...rest] = l.split('|')
  return { name, text: rest.join('|').replace('{STYLE}', style) }
})
const out = path.join(root, 'generated')
fs.mkdirSync(out, { recursive: true })

const missing = items.filter(({ name }) => {
  const hits = fs.readdirSync(out).filter((f) => new RegExp(`^${name}(_v\\d+)?\\.(png|jpg)$`).test(f))
  const file = hits.at(-1)
  if (!file) return true
  console.log(`${name}: retained (${file}); delete to regenerate`)
  return false
})
if (missing.length === 0) { console.log('all present'); process.exit(0) }
const promptsPath = path.join(root, 'prompts-expanded.local.txt')
fs.writeFileSync(promptsPath, missing.map(({ name, text }) => `${name}|${text}`).join('\n'))
console.log('generating:', missing.map((m) => m.name).join(', '))
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [kitGen, '-c', configPath, '-p', promptsPath, '--out', out, '--size', '2K', '--ref', path.join(repo, 'miniapp/art/ref-pages-v3/reference-ui.png')], { stdio: 'inherit', cwd: repo })
  child.on('error', reject)
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`gen exit ${code}`)))
})
