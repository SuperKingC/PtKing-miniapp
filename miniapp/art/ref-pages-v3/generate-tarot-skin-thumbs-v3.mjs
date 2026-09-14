// 重生两套牌桌预览：测测子 / 星夜圣殿。3:2 完整横构图，不用竖幅硬裁。
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

const jobs = [
  {
    name: 'clay',
    prompts: 'prompts-tarot-skin-thumbs-v3-clay.txt',
    out: 'art/generated-art/tarot-skin-thumbs-v3-clay',
    ref: 'art/generated-art/tarot/ui/sanctuary-background-clay-v2.jpg',
  },
  {
    name: 'classic',
    prompts: 'prompts-tarot-skin-thumbs-v3-classic.txt',
    out: 'art/generated-art/tarot-skin-thumbs-v3-classic',
    ref: 'art/generated-art/tarot/ui/sanctuary-background.jpg',
    style:
      '深蓝夜空圣殿插画，柔雾星空，圆形石拱月门，新月倒映静水，暗色祭坛长桌，细腻油画质感，高雅神秘，不要奶油软陶不要高调白底不要粘土小猫',
  },
]

function runJob(job) {
  const cfg = { ...baseCfg }
  if (job.style) cfg.style = job.style
  const configPath = path.join(root, `art.local.config.${job.name}.json`)
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2))
  const out = path.join(repo, job.out)
  fs.mkdirSync(out, { recursive: true })
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        kitGen,
        '-c', configPath,
        '-p', path.join(root, job.prompts),
        '--out', out,
        '--count', '2',
        '--ratio', '3:2',
        '--size', '2K',
        '--ref', path.join(repo, job.ref),
      ],
      { stdio: 'inherit', cwd: repo },
    )
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${job.name} exit ${code}`))))
  })
}

for (const job of jobs) {
  await runJob(job)
}
