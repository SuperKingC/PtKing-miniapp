// 诊断「点击刷新进测试页闪一下」：reLaunch 进测试页后高频采样布局指标+关键拍截图。
// 采样：hero 图高度(widthFix 何时撑开)/内联 opacity、grid 顶部 y、卡片数、分区标题文本。
// 判据：hero 高度 0→H 跳变 = hero 弹入闪；卡片数/分区文本变化 = registry 热更重渲染闪。
// 用法：node diag-refresh-flash.cjs
const automator = require('miniprogram-automator')
const path = require('node:path')
const fs = require('node:fs')
const shots = path.join(__dirname, '..', 'verify-shots')
fs.mkdirSync(shots, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  let mini
  for (let i = 0; i < 30; i++) {
    try {
      mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
      break
    } catch (e) {
      await sleep(3000)
    }
  }
  if (!mini) throw new Error('connect 9420 failed')
  mini.on('console', (msg) => {
    const text = (msg.args || []).join(' ')
    if (text) console.log(`[console:${msg.type}]`, text.slice(0, 200))
  })

  await mini.reLaunch('/pages/test/index')
  const page = await mini.currentPage()
  console.log('page =', page && page.path)

  const t0 = Date.now()
  const timeline = []
  let shotIdx = 0
  let prevHeroH = null
  let prevGridY = null
  let prevCards = null
  let prevSections = null

  for (let i = 0; i < 30; i++) {
    const now = Date.now() - t0
    let heroH = null
    let heroStyle = null
    let gridY = null
    let cards = null
    let sections = null
    try {
      const hero = await page.$('.test-page__hero-img')
      if (hero) {
        const size = await hero.size()
        heroH = size ? Math.round(size.height) : null
        heroStyle = await hero.attribute('style')
      }
      const grid = await page.$('.test-page__grid')
      if (grid) {
        const off = await grid.offset()
        gridY = off ? Math.round(off.top) : null
      }
      const cardEls = await page.$$('.test-page__card')
      cards = cardEls.length
      const secEls = await page.$$('.test-page__section-title')
      sections = []
      for (const el of secEls) sections.push((await el.text()).trim())
    } catch (e) {
      console.log(`[t=${now}ms] sample error:`, e.message)
    }

    const heroChanged = prevHeroH !== null && heroH !== null && Math.abs(heroH - prevHeroH) > 2
    const gridChanged = prevGridY !== null && gridY !== null && Math.abs(gridY - prevGridY) > 2
    const cardsChanged = prevCards !== null && cards !== null && cards !== prevCards
    const secChanged = prevSections !== null && sections !== null && sections.join('|') !== prevSections.join('|')
    const interesting = heroChanged || gridChanged || cardsChanged || secChanged || i === 0 || i === 1

    console.log(
      `[t=${String(now).padStart(5)}ms] heroH=${heroH} style=${heroStyle || '-'} gridY=${gridY} cards=${cards} sections=[${sections.join(' / ')}]` +
      (interesting ? '  <<< CHANGE' : '')
    )

    if (interesting) {
      const file = path.join(shots, `flash-${String(shotIdx++).padStart(2, '0')}-t${now}.png`)
      try {
        await mini.screenshot({ path: file })
        console.log('   shot →', path.basename(file))
      } catch (e) {
        console.log('   shot failed:', e.message)
      }
    }

    prevHeroH = heroH
    prevGridY = gridY
    prevCards = cards
    prevSections = sections
    await sleep(120)
  }

  await mini.disconnect()
  console.log('done')
}
main().catch((e) => { console.error(e.message); process.exit(1) })
