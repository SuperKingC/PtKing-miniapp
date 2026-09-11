// 临时验收：me 页列表/偏好卡提亮后实机截图
const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const shots = path.join(__dirname, '..', 'verify-shots')
fs.mkdirSync(shots, { recursive: true })

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  console.log('connected')
  await mini.reLaunch('/pages/me/index')
  await wait(2200)
  await mini.screenshot({ path: path.join(shots, 'me-page-cards-v2.png') })
  console.log('shot done')
  await mini.disconnect()
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
