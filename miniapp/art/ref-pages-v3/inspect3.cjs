const automator = require('miniprogram-automator')
;(async () => {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  const page = await mini.switchTab('/pages/test/index')
  await new Promise((r) => setTimeout(r, 2000))
  const hero = await page.$('.test-page__hero')
  console.log('hero exists:', !!hero)
  if (hero) {
    const img = await hero.$('.test-page__hero-img')
    console.log('hero img:', !!img, img && await img.attribute('src'))
  }
  // 滚到顶再截一张（switchTab 后可能停在原滚动位置，hero 在视口上方）
  await mini.pageScrollTo(0)
  await new Promise((r) => setTimeout(r, 1200))
  await mini.screenshot({ path: 'art/ref-pages-v3/shots/test-top.png' })
  console.log('shot test-top')
  await mini.disconnect()
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
