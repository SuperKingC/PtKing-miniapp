// 连微信开发者工具自动化端口，切「我的」tab 截图到 shots/
const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const root = __dirname
const shots = path.join(root, 'shots')
fs.mkdirSync(shots, { recursive: true })

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  console.log('connected')
  await mini.switchTab('/pages/me/index')
  await new Promise((r) => setTimeout(r, 1800))
  await mini.screenshot({ path: path.join(shots, 'me-redesign.png') })
  console.log('shot me-redesign')
  await mini.disconnect()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
