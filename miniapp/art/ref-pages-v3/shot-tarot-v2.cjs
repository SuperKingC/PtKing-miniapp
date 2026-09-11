// 验收四项：底栏随帘即藏 / 加载快进 / 新开场动画 / 头部下移+圆环居中
const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const shots = path.join(__dirname, '..', 'verify-shots')
fs.mkdirSync(shots, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let mini = null
const shot = async (name) => {
  await mini.screenshot({ path: path.join(shots, `${name}.png`) })
  console.log('shot', name)
}

async function openFlow(skinName) {
  let page = await mini.currentPage()
  const entries = await page.$$('.tarot-home__entry')
  await entries[0].tap()
  await wait(380) // closing 早期:底栏此刻应已隐藏
  await shot(`v2-${skinName}-early`)
  await wait(700) // ~1.1s holding: 星连线/帷幔+宝珠
  await shot(`v2-${skinName}-holding`)
  await wait(1500) // 加载完快进淡出后:流程页
  await shot(`v2-${skinName}-flow`)
  const flow = await mini.currentPage()
  const stage = await flow.$('.miniapp-tarot__stage--question')
  console.log(`${skinName} flow visible:`, !!stage)
  return flow
}

async function main() {
  mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  console.log('connected')

  // clay 全流程
  await mini.reLaunch('/pages/tarot/index')
  await wait(2400)
  await openFlow('clay')

  // 退出→切 classic→再来一遍
  let page = await mini.currentPage()
  const close = await page.$('.miniapp-tarot__header button')
  if (close) { await close.tap(); await wait(1400) }
  page = await mini.currentPage()
  const skins = await page.$$('.tarot-home__skin')
  if (skins.length >= 2) await skins[1].tap()
  await wait(900)
  await openFlow('classic')

  // classic 洗牌页圆环居中验证:填问题→洗牌
  page = await mini.currentPage()
  const input = await page.$('.miniapp-tarot__question')
  if (input) { await input.input('圆环居中验证'); await wait(300) }
  const next = await page.$('.miniapp-tarot__next')
  if (next) { await next.tap(); await wait(1600) }
  await shot('v2-classic-shuffle')

  await mini.disconnect()
  console.log('done')
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
