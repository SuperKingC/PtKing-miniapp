import type { TestDefinition } from '../testEngine'

/**
 * 恋爱人格测试（archetype 模式）：12 题、每题在四种恋爱人格间投票，最高票定型。
 * 四型取自恋爱关系中的经典行为模式，文案走趣味向，不做严肃心理测量声明。
 */

const REPORTS: TestDefinition['reports'] = {
  'love-guardian': {
    id: 'love-guardian',
    title: '护花使者型',
    tagline: '爱是把对方的一切安排好',
    summary:
      '你的测试结果显示你是护花使者型。恋爱里的你安全感拉满：记得对方的习惯、提前想好安排、把关心落在具体行动上。你要的爱情不是轰轰烈烈，而是「我一直都在」。',
    detail: [
      '行动派关心：你表达爱的方式是做事，不是甜言蜜语。',
      '稳定压倒一切：你讨厌暧昧不清，要的是确定关系。',
      '给你的提醒：偶尔也把心里的在意说出口，对方需要听见。',
    ],
  },
  'love-romantic': {
    id: 'love-romantic',
    title: '浪漫理想型',
    tagline: '爱情必须要有心动的感觉',
    summary:
      '你的测试结果显示你是浪漫理想型。你相信心动是爱情的入场券：纪念日期待惊喜、聊天期待火花、牵手要有感觉。你要的是「对的人」，而不是「合适的人」。',
    detail: [
      '心动至上：没有感觉的关系对你形同虚设。',
      '仪式感刚需：节日、纪念日在你这里都是大事。',
      '给你的提醒：心动会退潮，留意让你安心的那个人。',
    ],
  },
  'love-rational': {
    id: 'love-rational',
    title: '理性评估型',
    tagline: '爱情很重要，但脑子要在线',
    summary:
      '你的测试结果显示你是理性评估型。你不是不爱，而是习惯先看三观、习惯与长期相处的可能性。你要的是一段「聊得来、处得久」的关系，感情升温对你来说慢一点没关系。',
    detail: [
      '三观先行：聊天质量比外貌更能打动你。',
      '慢慢升温：你信任日久生情多于一见钟情。',
      '给你的提醒：偶尔放下评估清单，让感觉说句话。',
    ],
  },
  'love-free': {
    id: 'love-free',
    title: '自由灵魂型',
    tagline: '相爱，但谁也别想拴住谁',
    summary:
      '你的测试结果显示你是自由灵魂型。你渴望亲密，但同样需要自己的空间：恋爱要像朋友一样轻松，可以一起玩闹，也别查岗别翻手机。你要的是「我们很好，但我们也都是我们自己」。',
    detail: [
      '空间刚需：黏太紧的感情反而让你想逃。',
      '轻松至上：你想要的是能一起玩的好朋友式恋人。',
      '给你的提醒：遇到对的人，适度承诺其实不亏。',
    ],
  },
}

const OPTIONS: Array<{ text: string; reportId: string }> = [
  { text: '提前订好餐厅，安排好整天的行程', reportId: 'love-guardian' },
  { text: '准备一个小惊喜，氛围感拉满', reportId: 'love-romantic' },
  { text: '聊聊最近的计划和状态，深度长谈', reportId: 'love-rational' },
  { text: '想去哪去哪，玩得开心最重要', reportId: 'love-free' },
]

function q(text: string): TestDefinition['questions'][number] {
  return { text, options: OPTIONS.map((option) => ({ ...option })) }
}

export const LOVE_PERSONA_TEST: TestDefinition = {
  id: 'love-persona',
  title: '恋爱人格测试',
  category: '情感',
  meta: { minutes: 3, resultLabel: '4 型 · 解析' },
  intro: [
    '恋爱里的你，是踏实的安全感担当，还是浪漫的心动至上主义者？是理性评估的长期主义者，还是渴望空间的自由灵魂？',
    '12 道轻松的场景题，带你快速看清自己在恋爱中的天然姿态——没有好坏之分，只有更懂自己的相处方式。',
  ],
  notice: '该测试可免费测试+查看个人结果报告，包含恋爱人格类型与相处建议。感谢你的理解与支持。',
  questions: [
    q('第一次约会，你的理想安排是？'),
    q('对方一天没回消息，你会？'),
    q('你更向往的相处状态是？'),
    q('吵架之后，你通常？'),
    q('你选择伴侣时，最先看重？'),
    q('对「查手机」这件事，你觉得？'),
    q('纪念日对你来说？'),
    q('你理想中的爱情更像？'),
    q('对方提议来一场说走就走的短途旅行，你的反应是？'),
    q('你觉得纪念日仪式感的意义更多是？'),
    q('两个人意见不一致时，你更看重？'),
    q('聊到未来的生活规划，你的态度是？'),
  ],
  scoring: { type: 'archetype', reports: ['love-guardian', 'love-romantic', 'love-rational', 'love-free'] },
  reports: REPORTS,
}
