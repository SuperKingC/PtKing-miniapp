import type { TestDefinition } from '../testEngine'

/**
 * 精神内耗型职业倦怠自查（band 模式）：12 题、每题 0-3 分四档，总分 0-36 落三档。
 * 趣味向职业状态觉察，文案避免「诊断/治疗」临床措辞（合规红线），结尾档位引导休息而非医疗建议。
 */

const OPTIONS: TestDefinition['questions'][number]['options'] = [
  { text: '完全没有', weight: 0 },
  { text: '偶尔如此', weight: 1 },
  { text: '经常如此', weight: 2 },
  { text: '每天如此', weight: 3 },
]

function q(text: string): TestDefinition['questions'][number] {
  return { text, options: OPTIONS.map((option) => ({ ...option })) }
}

export const BURNOUT_TEST: TestDefinition = {
  id: 'burnout',
  title: '职场倦怠测试',
  category: '职场',
  meta: { minutes: 3, resultLabel: '3 档 · 建议' },
  intro: [
    '周一睁眼就疲惫、开会只想划水、下班只想躺平？倦怠不是懒，是能量账户长期「只取不存」后的余额不足信号。',
    '12 道近期状态自查题，3 分钟看看你的职业能量余额，附对应的小建议。',
  ],
  notice: '该测试为自我觉察工具，非医疗评估；可免费测试+查看个人结果报告。',
  questions: [
    q('早上想到要上班，身体的第一个反应是？'),
    q('工作时你会机械应付，不想多花心思？'),
    q('下班后还有精力做自己的事吗？'),
    q('工作成果被肯定时，你还有感觉吗？'),
    q('你会用「摸鱼」拖到最后一刻才交？'),
    q('对「明年这时候我还在这个岗位」的感受？'),
    q('休假结束的前一晚，你的状态？'),
    q('你有多久没有为工作上的事感到兴奋了？'),
    q('工作消息能拖就拖，不想点开？'),
    q('你开始用「没意义」形容手里的活儿？'),
    q('同事约饭/团建，你的第一反应是想躲？'),
    q('想到「一年后还在做现在的事」，你的感受是？'),
  ],
  scoring: {
    type: 'band',
    max: 36,
    bands: [
      { min: 0, max: 12, reportId: 'burnout-fresh' },
      { min: 13, max: 24, reportId: 'burnout-tired' },
      { min: 25, max: 36, reportId: 'burnout-empty' },
    ],
  },
  reports: {
    'burnout-fresh': {
      id: 'burnout-fresh',
      title: '能量满格',
      tagline: '现在的你，工作是有奔头的',
      summary:
        '你的职业能量充沛：有干劲、有盼头、下班后还有自己的生活。你 currently 处在职业状态的良性区间，现在的节奏值得保持。',
      detail: [
        '你的优势：投入有回报感，这是抵御倦怠最硬的通货。',
        '保持秘诀：把让你兴奋的项目多做记录，低谷时是精神储备。',
        '小提醒：别用「永远满格」要求自己，允许自己有低电量日。',
      ],
    },
    'burnout-tired': {
      id: 'burnout-tired',
      title: '电量偏低',
      tagline: '不是不想干，是有点干不动了',
      summary:
        '你的职业能量偏低：疲惫感开始渗进日常，成就感变淡，「混到下班」的念头变多。这是能量账户发出的提醒——该给自己安排「充值」了，别等到余额见底。',
      detail: [
        '典型信号：拖延变多、钝感变强、周末只想瘫着不动。',
        '小建议：先补觉再谈规划——很多「职业迷茫」本质是缺觉。',
        '小建议：每周留一件「只为自己做」的事，把工作和自我重新分开。',
      ],
    },
    'burnout-empty': {
      id: 'burnout-empty',
      title: '余额告急',
      tagline: '你已经硬撑太久了',
      summary:
        '你的职业能量余额告急：多个重度信号同时出现，说明你已经「只取不存」太久了。这不是你的错，是时候认真对待自己的状态——先停下来，再谈方向。',
      detail: [
        '第一优先：给自己一段真正的休息，哪怕意味着短暂降低标准。',
        '小建议：列出「最消耗你」的三件事，看看哪些其实可以拒绝或 delegate。',
        '小提醒：如果疲惫已严重影响睡眠与情绪，寻求专业支持是聪明而非软弱。',
      ],
    },
  },
}
