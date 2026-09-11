const automator = require('miniprogram-automator')
const path = require('node:path')
const verifyShots = path.join(__dirname, '..', '..', 'verify-shots')
async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9421' })
  try {
    for (const [route, selector] of [['test', '.test-page__brand-title'], ['tarot', '.tarot-home__title'], ['records', '.records-page__title']]) {
      await mini.callWxMethod('switchTab', { url: `/pages/${route}/index` })
      const page = await mini.currentPage()
      await page.waitFor(selector)
      console.log(route, await (await page.$(selector)).text())
      await mini.screenshot({ path: path.join(verifyShots, `${route}-preview.png`) })
    }
  } finally {
    await mini.callWxMethod('switchTab', { url: '/pages/test/index' })
    await mini.disconnect()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
