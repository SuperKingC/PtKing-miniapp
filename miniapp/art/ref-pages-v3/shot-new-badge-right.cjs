// NEW 右上角落位验收：滚动到热门榜第 4 卡（Chiikawa，带 NEW），双帧截图确认静态不飘
const automator = require('miniprogram-automator')
const path = require('node:path')
const shots = path.join(__dirname, '..', 'verify-shots')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  let mini
  for (let i = 0; i < 20; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' }); break } catch (e) { await sleep(2000) }
  }
  if (!mini) throw new Error('connect 9420 failed')
  const page = await mini.reLaunch('/pages/test/index')
  await sleep(2800)
  const scroll = await page.$('.tab-page__scroll')
  await scroll.scrollTo(0, 300)
  await sleep(900)
  await mini.screenshot({ path: path.join(shots, 'new-right-frame1.png') })
  await sleep(1100)
  await mini.screenshot({ path: path.join(shots, 'new-right-frame2.png') })
  // 切情感分类看主列表里的嘴硬心软（带 NEW）
  const chips = await page.$$('.test-page__chip')
  await chips[1].tap()
  await sleep(1200)
  await mini.screenshot({ path: path.join(shots, 'new-emotion.png') })
  await mini.disconnect()
  console.log('shots done')
}
main().catch((e) => { console.error(e); process.exit(1) })
