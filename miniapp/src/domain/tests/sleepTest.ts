import type { TestDefinition } from '../testEngine'

/**
 * 睡眠质量测试（band 模式）：12 题、每题 0-3 分四档，总分 0-36 落三档报告。
 * 趣味向生活方式自查，文案避免「诊断/障碍/治疗」等临床措辞（合规红线）。
 */

const OPTIONS: TestDefinition['questions'][number]['options'] = [
  { text: '从不如此', weight: 0 },
  { text: '偶尔如此', weight: 1 },
  { text: '经常如此', weight: 2 },
  { text: '几乎每天', weight: 3 },
]

function q(text: string): TestDefinition['questions'][number] {
  return { text, options: OPTIONS.map((option) => ({ ...option })) }
}

export const SLEEP_TEST: TestDefinition = {
  id: 'sleep',
  title: '睡眠质量测试',
  category: '趣味',
  meta: { minutes: 3, resultLabel: '3 档 · 建议' },
  intro: [
    '睡够 8 小时却还是累？躺下半小时睡不着？凌晨三点脑子突然开机？睡眠质量不只在时长，更在「落地质量」。',
    '12 道近况自查题，3 分钟看看你最近的睡眠成色，并附上对应的小建议。',
  ],
  notice: '该测试为生活方式自查工具，非医疗评估；可免费测试+查看个人结果报告。',
  questions: [
    q('躺下后超过半小时才能睡着？'),
    q('夜里会醒过来一次以上？'),
    q('早上醒来感觉像没睡过？'),
    q('白天会突然困到不行？'),
    q('睡前最后一件事是刷手机？'),
    q('周末会补觉补到中午？'),
    q('睡前脑子里事情停不下来？'),
    q('咖啡或浓茶是你的日常标配？'),
    q('睡着后一点小动静就会把你弄醒？'),
    q('每天的入睡和起床时间差得很远？'),
    q('白天不靠咖啡/浓茶就撑不下去？'),
    q('越到该睡的时间，脑子反而越清醒？'),
  ],
  scoring: {
    type: 'band',
    max: 36,
    bands: [
      { min: 0, max: 12, reportId: 'sleep-good' },
      { min: 13, max: 24, reportId: 'sleep-mid' },
      { min: 25, max: 36, reportId: 'sleep-low' },
    ],
  },
  reports: {
    'sleep-good': {
      id: 'sleep-good',
      title: '黄金睡眠',
      tagline: '躺下就着，醒来满电',
      summary: `你的睡眠成色很好：入睡快、夜里稳、白天精神在线。你的身体节律正在良性循环，保持现在的作息节奏就好。`,
      detail: [
        '你的优势：生物钟稳定，深睡占比大概率不错。',
        '保持秘诀：维持固定的入睡和起床时间，周末也别偏太多。',
        '小提醒：换季或出差时留意节律，别让好状态悄悄溜走。',
      ],
    },
    'sleep-mid': {
      id: 'sleep-mid',
      title: '亚健康睡眠',
      tagline: '睡眠还行，但有几个漏电口',
      summary: `你的睡眠处于「能用但不饱和」状态：可能有入睡慢、夜醒或白天犯困其中一个。这类问题多数和睡前习惯有关，调整空间很大。`,
      detail: [
        '典型信号：刷手机到最后一刻、周末狂补觉、咖啡因越喝越晚。',
        '小建议：给睡前 30 分钟设个「无手机结界」，卧室灯光调暗。',
        '小建议：补觉别超过 2 小时，比平时晚起 1 小时是上限。',
      ],
    },
    'sleep-low': {
      id: 'sleep-low',
      title: '透支预警',
      tagline: '你的睡眠账户已经出现赤字',
      summary: `你的睡眠状况值得关注：多个信号同时出现，说明睡眠债已经积累了一段时间。别慌，但请认真对待——睡眠是精力和情绪的地基，地基松了上面全都晃。`,
      detail: [
        '第一优先：固定起床时间。先锚定早上，晚上自然会前移。',
        '小建议：咖啡因只在中午前喝；睡前把手机请出卧室。',
        '小建议：如果长期睡不着且影响白天状态，建议咨询专业医生。',
      ],
    },
  },
}
