import type { TestDefinition } from '../testEngine'

/**
 * 依恋风格测试（archetype 模式）：8 题、四类依恋风格投票最高票。
 * 基于成人依恋理论的趣味化科普（安全/焦虑/回避/恐惧-回避），文案避免临床化断言。
 */

const REPORTS: TestDefinition['reports'] = {
  'attach-secure': {
    id: 'attach-secure',
    title: '安全型依恋',
    tagline: '我爱你，但我的人生不是只有你',
    summary:
      '你的测试结果显示你偏向安全型依恋。亲密关系里的你既享受靠近，也保有自己的世界：能放心依赖对方，也能坦然独处。这是亲密关系里最舒服的底色。',
    detail: [
      '你的优势：吵架不翻旧账，需要就说出口，让对方猜是你的反义词。',
      '关系真相：你的稳定会「传染」，和你恋爱的人安全感都不会太低。',
      '给你的提醒：遇到焦虑型的伴侣，多一句「我在」胜过一万句道理。',
    ],
  },
  'attach-anxious': {
    id: 'attach-anxious',
    title: '焦虑型依恋',
    tagline: '消息不回的每一分钟我都在脑补',
    summary:
      '你的测试结果显示你偏向焦虑型依恋。你在感情里投入得又快又深，也容易对方一个眼神就开始「内心小剧场」。你不是作，你只是需要比常人更多的确认。',
    detail: [
      '典型信号：反复看手机、过度解读语气、害怕被冷淡对待。',
      '关系真相：你要的不是对方秒回，而是一份「你很重要」的确定感。',
      '给你的提醒：把「你怎么了」换成「我有点不安，想聊聊」，威力翻倍。',
    ],
  },
  'attach-avoidant': {
    id: 'attach-avoidant',
    title: '回避型依恋',
    tagline: '不是不爱，是靠太近会想逃',
    summary:
      '你的测试结果显示你偏向回避型依恋。关系升温太快时你会莫名想撤退，压力大到窒息时你会自动封闭。你习惯自己消化情绪，因为从小的经验告诉你：靠人不如靠己。',
    detail: [
      '典型信号：忙碌是万能挡箭牌、亲密后习惯性找茬、情绪上头就想静一静。',
      '关系真相：你要的不是不要爱，而是「不会吞掉我的爱」。',
      '给你的提醒：告诉伴侣「我需要独处，但我不是不要你」，能省掉一半误会。',
    ],
  },
  'attach-fearful': {
    id: 'attach-fearful',
    title: '又怕冷又怕烫型',
    tagline: '渴望拥抱，又怕被拥抱烫伤',
    summary:
      '你的测试结果显示你偏向恐惧-回避型（矛盾型）依恋。你一边渴望亲密、一边害怕受伤：靠近了想逃，疏远了又慌。这种「油门刹车一起踩」的状态让你在感情里格外累。',
    detail: [
      '典型信号：暧昧期最投入、确定关系后开始挑刺、忽冷忽热不是本意。',
      '关系真相：你怕的不是亲密本身，是「亲密之后的失去」。',
      '给你的提醒：矛盾感来临先别行动，写下来或者找朋友聊聊，慢半拍就是进步。',
    ],
  },
}

const OPTIONS: Array<{ text: string; reportId: string }> = [
  { text: '直接说出口，把话摊开讲清楚', reportId: 'attach-secure' },
  { text: '内心翻江倒海，忍不住反复确认', reportId: 'attach-anxious' },
  { text: '假装没事，自己躲起来消化', reportId: 'attach-avoidant' },
  { text: '想沟通又怕说错话，纠结到内伤', reportId: 'attach-fearful' },
]

function q(text: string): TestDefinition['questions'][number] {
  return { text, options: OPTIONS.map((option) => ({ ...option })) }
}

export const ATTACHMENT_TEST: TestDefinition = {
  id: 'attachment-style',
  title: '依恋风格测试',
  category: '情感',
  meta: { minutes: 3, resultLabel: '4 型 · 解析' },
  intro: [
    '为什么有人恋爱后越来越安心，有人却总在「作」与「逃」之间反复横跳？成人依恋理论认为，我们在亲密关系里的姿态，早在童年就悄悄埋下了底稿。',
    '8 道场景题，看看你在亲密关系里偏向哪种依恋风格——了解它是为了理解自己，而不是给自己贴标签。',
  ],
  notice: '该测试为趣味心理科普，非临床评估；可免费测试+查看个人结果报告。',
  questions: [
    q('对方突然变得冷淡，你的第一反应是？'),
    q('关系里你最怕的是？'),
    q('伴侣提出「我需要一点自己的空间」，你会？'),
    q('吵架之后你通常？'),
    q('对「报备行踪」这件事，你觉得？'),
    q('感情升温很快时，你的感觉是？'),
    q('你更容易被哪种人吸引？'),
    q('关于「依赖别人」，你内心更接近哪种声音？'),
  ],
  scoring: {
    type: 'archetype',
    reports: ['attach-secure', 'attach-anxious', 'attach-avoidant', 'attach-fearful'],
  },
  reports: REPORTS,
}
