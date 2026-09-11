const automator = require('miniprogram-automator')
const path = require('node:path')
async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9421' })
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    await mini.callWxMethod('switchTab', { url: '/pages/records/index' })
    const page = await mini.currentPage()
    await page.waitFor('.records-page__title')
    console.log('records', await (await page.$('.records-page__title')).text())
    await new Promise((resolve) => setTimeout(resolve, 1200))
    await mini.screenshot({ path: path.join(__dirname, 'records-preview.png') })
  } finally {
    await mini.disconnect()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
