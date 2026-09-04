import type { TestDefinition } from '../testEngine'

/**
 * 手机依赖测试（band 模式）：20 题、每题 0-3 分四档，总分 0-60 落三档。
 * 趣味向数字生活习惯自查，非医疗口径。
 */

const OPTIONS: TestDefinition['questions'][number]['options'] = [
  { text: '从不这样', weight: 0 },
  { text: '偶尔这样', weight: 1 },
  { text: '经常这样', weight: 2 },
  { text: '机不离手', weight: 3 },
]

function q(text: string): TestDefinition['questions'][number] {
  return { text, options: OPTIONS.map((option) => ({ ...option })) }
}

export const PHONE_TEST: TestDefinition = {
  id: 'phone-addiction',
  title: '手机依赖测试',
  category: '趣味',
  meta: { minutes: 4, resultLabel: '3 档 · 建议' },
  intro: [
    '「再刷五分钟」变成两小时、手机不在身边就心慌、上厕所必带手机……你用的是手机，还是手机在用你？',
    '20 道日常习惯题，3 分钟测测你的「人机关系」成色，附对应的小建议。',
  ],
  notice: '该测试为趣味生活习惯自查，非医疗评估；可免费测试+查看个人结果报告。',
  questions: [
    q('醒来第一件事是摸手机？'),
    q('没有手机的厕所，会很不完整？'),
    q('明知没人找，还是会反复点亮屏幕？'),
    q('「再刷五分钟」实际会变成一小时以上？'),
    q('手机电量低于 30% 会开始焦虑？'),
    q('和朋友吃饭也忍不住各自刷手机？'),
    q('没有手机的等待时间（排队等车），你会？'),
    q('睡前最后一个动作和醒来第一个动作都是它？'),
    q('吃饭时手机必须放在手边？'),
    q('一觉得无聊，第一反应就是掏手机？'),
    q('明明没什么要紧事，也要把各个 App 轮着刷一遍？'),
    q('你会因为刷手机一拖再拖不睡觉？'),
    q('走路的时候也在看手机？'),
    q('手机不在视线内会心慌？'),
    q('睡前刷手机超过半小时？'),
    q('有 3 个以上每天必刷的 App？'),
    q('吃饭时也要配个视频？'),
    q('充电宝没电比钱包没带更慌？'),
    q('会无意识解锁手机又锁上？'),
    q('有人要借你手机，你会紧张？'),
  ],
  scoring: {
    type: 'band',
    max: 60,
    bands: [
      { min: 0, max: 20, reportId: 'phone-balanced' },
      { min: 21, max: 40, reportId: 'phone-tied' },
      { min: 41, max: 60, reportId: 'phone-hooked' },
    ],
  },
  reports: {
    'phone-balanced': {
      id: 'phone-balanced',
      title: '人机大师',
      tagline: '手机是你的工具，不是你的主人',
      summary:
        '你与手机的关系很健康：需要时用它，不需要时放得下。你的注意力还牢牢长在自己脑子里——这在 2026 年是相当稀缺的能力。',
      detail: [
        '你的优势：注意力完整，专注力是你隐形的竞争力。',
        '保持秘诀：维持「手机不进卧室/不占饭桌」的小规矩。',
        '小提醒：换新设备或新App时留个心眼，习惯是悄悄长回来的。',
      ],
    },
    'phone-tied': {
      id: 'phone-tied',
      title: '藕断丝连',
      tagline: '说好只刷五分钟，抬头已是两小时',
      summary:
        '你和手机处于「互相牵制」状态：心里想放下，手却很诚实。碎片时间基本被它承包，但大体上你还能正常生活——这是改善的黄金窗口期。',
      detail: [
        '典型信号：等待必刷、睡前必刷、无聊就掏手机三件套。',
        '小建议：给最耗时的App设个每日限额，让系统替你把关。',
        '小建议：把手机充电位挪出卧室，一周后你会回来点赞。',
      ],
    },
    'phone-hooked': {
      id: 'phone-hooked',
      title: '深度绑定',
      tagline: '你的注意力正在被它「分期付款」',
      summary:
        '你的生活已经和手机深度绑定：吃饭、如厕、睡前、醒来，它的存在感覆盖了你的全天候。别自责——这些App背后是上千名工程师的「注意力设计」。知道问题在哪，就是夺回主动权的第一步。',
      detail: [
        '第一步：先「看见」——开一周屏幕使用时间统计，数字最有说服力。',
        '小建议：把高频App移出首屏，给每次点亮加一道「手滑成本」。',
        '小建议：每天设一段 30 分钟的「无手机时间」，散步、发呆都行，重新体会无聊的滋味。',
      ],
    },
  },
}
