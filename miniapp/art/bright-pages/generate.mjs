import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const cfg = JSON.parse(fs.readFileSync('D:/Mine/PtKing-miniapp/art.config.json', 'utf8'))
cfg.compress.tinypngKeyEnv = 'DESIGN_PREVIEW_NO_COMPRESSION'
cfg.prompt.background = ''
cfg.output.maxTotalMB = 30
cfg.style += ', bright high-key lighting, slightly stronger rounded 3D volume, lifted shadows, never dark or muddy'
const configPath = path.join(root, 'art.local.config.json')
fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2))
const ref = 'C:/Users/admin/.cursor/projects/d-Mine-PtKing-miniapp/assets/c__Users_admin_AppData_Roaming_Cursor_User_workspaceStorage_82a36c340e95d2cfdc330b44ebc1acff_images_ui-4-1d4d7e8a-3fe6-4205-a051-aea56e059d16.jpg'
const filenames = { tarot: 'tarot-home-clay-v1.png', records: 'records-book-clay-v1.png' }
const missing = Object.keys(filenames).filter(name => {
  const output = path.join(root, 'generated-art', name, filenames[name])
  if (!fs.existsSync(output)) return true
  if (fs.statSync(output).size === 0) throw new Error(`${name}: existing output is empty; inspect before regenerating`)
  console.log(`${name}: existing original retained; skipping generation`)
  return false
})
await Promise.all(missing.map(name => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['D:/Mine/miniapp-kit/art/gen.mjs', '-c', configPath, '-p', path.join(root, `${name}.txt`), '--out', path.join(root, 'generated-art', name), '--ratio', name === 'tarot' ? '3:2' : '1:1', '--ref', ref], { stdio: 'inherit' })
  child.on('error', reject)
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${name}: ${code}`)))
})))
