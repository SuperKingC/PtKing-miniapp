// 临时验收：tab选中态 + 流程内底栏隐藏 + 圆环居中 + 两皮肤帘幕开场
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

async function openFlowAndShoot(skinName) {
  // 塔罗首页 → 点单张指引入口 → 帘幕三连拍 → 流程洗牌页
  let page = await mini.currentPage()
  const entries = await page.$$('.tarot-home__entry')
  if (!entries.length) throw new Error('entries not found')
  await entries[0].tap()
  await wait(420) // closing 中段(0.9s 合拢)
  await shot(`curtain-${skinName}-closing`)
  await wait(1000) // ~1.4s: holding(星显/加载条)
  await shot(`curtain-${skinName}-holding`)
  await wait(1900) // 加载完成+最短hold后淡出完毕,进入流程
  await shot(`flow-${skinName}-shuffle`)
  const flow = await mini.currentPage()
  const hidden = await flow.$('.tabbar--hidden')
  console.log(`${skinName}: tabbar hidden in flow:`, !!hidden)
  return flow
}

async function main() {
  mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  console.log('connected')

  // ── A. tab 选中态:连续切换后落塔罗,查乐观 storage + 截图 ──
  await mini.reLaunch('/pages/test/index')
  await wait(2000)
  const routes = ['/pages/records/index', '/pages/tarot/index', '/pages/test/index', '/pages/me/index', '/pages/tarot/index']
  for (const route of routes) {
    await mini.switchTab(route)
    await wait(1300)
    const v = await mini.callWxMethod('getStorageSync', 'ptking:tabbar-selected')
    console.log('switch→', route, 'storage:', v)
  }
  // 当前在塔罗首页,截图核验选中态高亮在「塔罗」
  await shot('tab-selected-tarot-home')

  // ── B. clay 皮肤帘幕开场 + 流程内底栏隐藏 + 圆环居中 ──
  const flow = await openFlowAndShoot('clay')

  // 洗牌阶段长按一点让进度条有值,再截一张圆环居中对照
  const deck = await flow.$('.miniapp-tarot__shuffle-deck')
  if (deck) {
    await deck.touchstart()
    await wait(600)
    await deck.touchend()
    await wait(400)
  }
  await shot('flow-clay-shuffle-progress')

  // 退出流程回首页
  const closeBtn = await flow.$('.miniapp-tarot__header button')
  if (closeBtn) {
    await closeBtn.tap()
    await wait(1200)
  }

  // ── C. classic 皮肤 ──
  let home = await mini.currentPage()
  const skins = await home.$$('.tarot-home__skin')
  console.log('skins:', skins.length)
  if (skins.length >= 2) await skins[1].tap()
  await wait(1000)
  await openFlowAndShoot('classic')

  await mini.disconnect()
  console.log('done')
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
