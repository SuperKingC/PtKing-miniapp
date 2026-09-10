// 连微信开发者工具自动化端口，依次切三个 tab 截图到 shots/
const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const root = __dirname
const shots = path.join(root, 'shots')
fs.mkdirSync(shots, { recursive: true })

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  console.log('connected')
  const tabs = [
    ['test', '/pages/test/index'],
    ['tarot', '/pages/tarot/index'],
    ['records', '/pages/records/index'],
  ]
  for (const [name, route] of tabs) {
    const page = await mini.switchTab(route)
    await new Promise((r) => setTimeout(r, 1800))
    await mini.screenshot({ path: path.join(root, 'shots', `${name}.png`) })
    console.log('shot', name, page && page.path)
  }
  // 我的页对照枕头感
  await mini.switchTab('/pages/me/index')
  await new Promise((r) => setTimeout(r, 1500))
  await mini.screenshot({ path: path.join(root, 'shots', 'me.png') })
  console.log('shot me')
  await mini.disconnect()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
