// 截测试页看角标现状:node shot-badges.cjs
const automator = require('miniprogram-automator')
const path = require('node:path')
const shots = path.join(__dirname, '..', 'verify-shots')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  let mini
  for (let i = 0; i < 20; i++) {
    try {
      mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
      break
    } catch (e) { await sleep(2000) }
  }
  if (!mini) throw new Error('connect 9420 failed')
  console.log('connected')
  await mini.reLaunch('/pages/test/index')
  await sleep(2600)
  await mini.screenshot({ path: path.join(shots, 'badges-before-full.png') })
  // 滚到列表区再截一张(热门榜卡片)
  const page = await mini.currentPage()
  try {
    const sys = await mini.systemInfo()
    await mini.pageScrollTo(620)
    await sleep(1200)
    await mini.screenshot({ path: path.join(shots, 'badges-before-list.png') })
  } catch (e) { console.log('scroll fail', e.message) }
  await mini.disconnect()
  console.log('done')
}
main().catch((e) => { console.error(e); process.exit(1) })
