// 用 automator 查「我的」页 entry/icon/banner 真实布局几何(px,按 750rpx 屏宽换算)
const automator = require('miniprogram-automator')

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  const page = await mini.currentPage()
  console.log('page path:', page.path)
  const sys = await mini.systemInfo()
  console.log('screenWidth:', sys.screenWidth, 'windowWidth:', sys.windowWidth)

  const entries = await page.$$('.me-page__entry')
  console.log('entries:', entries.length)
  for (const el of entries) {
    const size = await el.size()
    const offset = await el.offset()
    console.log(`entry size ${size.width}x${size.height} top ${offset.top} left ${offset.left}`)
  }
  const icons = await page.$$('.me-page__icon')
  for (const el of icons.slice(0, 2)) {
    const size = await el.size()
    console.log(`icon size ${size.width}x${size.height}`)
  }
  const banner = await page.$('.me-page__banner')
  if (banner) {
    const size = await banner.size()
    console.log(`banner size ${size.width}x${size.height}`)
  }
  const entriesCard = await page.$('.me-page__entries')
  if (entriesCard) {
    const size = await entriesCard.size()
    console.log(`entries-card size ${size.width}x${size.height}`)
  }
  await mini.disconnect()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
