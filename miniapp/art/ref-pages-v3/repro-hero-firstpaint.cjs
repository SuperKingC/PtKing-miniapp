// 复现 hero 首帧渲染异常：进入测试页立即截图 → 滚远再回顶 → 再截图。
// 用法：node repro-hero-firstpaint.cjs
const automator = require('miniprogram-automator')
const path = require('node:path')
const shots = path.join(__dirname, '..', 'verify-shots')
require('node:fs').mkdirSync(shots, { recursive: true })

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
  console.log('connected')

  // 全新进入测试页
  await mini.reLaunch('/pages/test/index')
  await sleep(1400)
  await mini.screenshot({ path: path.join(shots, 'hero-first.png') })
  console.log('shot hero-first')

  const page = await mini.currentPage()
  // 滚很远再回顶
  await mini.pageScrollTo(2600)
  await sleep(900)
  await mini.pageScrollTo(0)
  await sleep(1100)
  await mini.screenshot({ path: path.join(shots, 'hero-after-scroll.png') })
  console.log('shot hero-after-scroll, page=', page && page.path)

  await mini.disconnect()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
