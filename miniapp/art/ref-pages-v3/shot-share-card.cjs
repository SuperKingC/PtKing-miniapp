// 分享卡片预览：注入四分类记录 → 逐个报告页截图（临时方案：share canvas 以 TEMP-PREVIEW 固定可视区）
// 记录 result 用真实 scoreTest 产物（合成 bandScore:null 会触发报告页渲染崩溃，属非法状态）
// 用法：node shot-share-card.cjs
const automator = require('miniprogram-automator')
const fs = require('node:fs')
const path = require('node:path')
const shots = path.join(__dirname, '..', 'verify-shots')
require('node:fs').mkdirSync(shots, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const real3 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'verify-shots', 'real-results-3.json'), 'utf8'))
const realEq = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'verify-shots', 'real-result.json'), 'utf8'))

const record = (testId, result, title, tagline, labels, testedCount, testTitle) => ({
  testId,
  finishedAt: '2026-09-15T10:00:00.000Z',
  result,
  locked: false,
  testTitle,
  resultTitle: title,
  reportSnapshot: { id: title, title, tagline, summary: '', detail: [''], labels },
})

const records = [
  record('mbti', real3.mbti, '深度共情型倾听者', '共情力是你出厂自带的配置，别浪费', ['共情力顶配', '人间清醒观察员'], 235000, 'MBTI 人格测试'),
  record('soft-heart', real3['shell-tender'], '冰壳暖核型', '嘴上是拒绝，身体很诚实，心软得一塌糊涂', ['嘴硬心软', '刀子嘴豆腐心认证'], 152000, '嘴硬心软指数'),
  record('eq', realEq, '待升级系统', '不是不会说话，是还没意识到话的重量，给自己留一个台阶', ['给自己留一个台阶'], 68000, '情商段位鉴定'),
  record('goofy', real3.goofy, '已疯但可爱，还是清醒着', '疯感是保护色，清醒是底色', ['已疯但可爱'], 99000, '憨憨指数测试'),
]

const cases = [
  ['renge', 'mbti'],
  ['qinggan', 'soft-heart'],
  ['zhichang', 'eq'],
  ['quwei', 'goofy'],
]

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

  await mini.callWxMethod('setStorageSync', 'ptking_test_records', JSON.stringify(records))
  for (const [name, testId] of cases) {
    // 双导航：首访偶发 canvas 节点未就绪导致分享卡白板（renderShareCard 静默失败），二访绘制稳定
    await mini.reLaunch('/pages/test-report/index?testId=' + testId)
    await sleep(2200)
    await mini.reLaunch('/pages/test-report/index?testId=' + testId)
    await sleep(2600)
    await mini.screenshot({ path: path.join(shots, `share-card-${name}.png`) })
    console.log('shot', name, testId)
  }
  await mini.disconnect()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
