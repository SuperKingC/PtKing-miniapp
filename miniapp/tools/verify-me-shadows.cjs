const automator = require('miniprogram-automator')
const path = require('node:path')

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  try {
    await mini.callWxMethod('switchTab', { url: '/pages/me/index' })
    const page = await mini.currentPage()
    await page.waitFor('.me-page__banner-img')
    const banner = await page.$('.me-page__banner-img')
    console.log('Page:', page.path, 'Banner:', await banner.size())
    console.log('Banner filter:', await banner.style('filter'))
    const entries = await page.$('.me-page__entries')
    console.log('Entries shadow:', await entries.style('box-shadow'))
    await mini.screenshot({ path: path.resolve(__dirname, '../me-shadow-acceptance.png') })
    console.log('Screenshot: miniapp/me-shadow-acceptance.png')
  } finally {
    await mini.disconnect()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
