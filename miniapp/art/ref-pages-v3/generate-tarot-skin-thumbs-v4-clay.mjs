// 只重生测测子牌桌预览：长桌 + 烛火 + 更密的天上细节。
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, '../../..')
const kitGen = path.resolve(repo, '../miniapp-kit/art/gen.mjs')
const baseCfg = JSON.parse(fs.readFileSync(path.join(repo, 'art.config.json'), 'utf8'))
baseCfg.compress.tinypngKeyEnv = 'DESIGN_PREVIEW_NO_COMPRESSION'
baseCfg.output.maxTotalMB = 40
baseCfg.api.models = [
  'openai/gpt-5.4-image-2',
  'google/gemini-3.1-flash-image-preview',
  'google/gemini-3-pro-image-preview',
]
baseCfg.api.concurrency = 2
const configPath = path.join(root, 'art.local.config.clay-v4.json')
fs.writeFileSync(configPath, JSON.stringify(baseCfg, null, 2))

const out = path.join(repo, 'art/generated-art/tarot-skin-thumbs-v4-clay')
fs.mkdirSync(out, { recursive: true })
const child = spawn(
  process.execPath,
  [
    kitGen,
    '-c', configPath,
    '-p', path.join(root, 'prompts-tarot-skin-thumbs-v4-clay.txt'),
    '--out', out,
    '--count', '2',
    '--ratio', '4:3',
    '--size', '2K',
    '--ref', path.join(repo, 'art/generated-art/tarot/ui/sanctuary-background-clay-v2.jpg'),
  ],
  { stdio: 'inherit', cwd: repo },
)
child.on('exit', (code) => process.exit(code ?? 1))
