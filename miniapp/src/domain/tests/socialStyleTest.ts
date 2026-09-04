import type { TestDefinition } from '../testEngine'

/**
 * 社交人格测试（archetype 模式）：8 题、四类社交风格投票最高票。
 * 趣味向自我认知内容，不带评判：每种风格都有闪光点与提醒。
 */

const REPORTS: TestDefinition['reports'] = {
  'social-spark': {
    id: 'social-spark',
    title: '气氛点燃型',
    tagline: '你在哪，笑声就在哪',
    summary:
      '你的测试结果显示你是气氛点燃型。聚会有你就有梗，冷场有你就不存在。你的社交能量天然外放，认识五分钟就能聊成老朋友，人群因你而热起来。',
    detail: [
      '你的闪光点：天然的破冰能力，新局老局都缺不了你。',
      '社交真相：热闹给你充电，而不是耗电，这是稀缺天赋。',
      '给你的提醒：留一晚「不营业」的独处，把真实想法留给最亲的人。',
    ],
  },
  'social-anchor': {
    id: 'social-anchor',
    title: '深度连接型',
    tagline: '朋友不在多，一个顶十个',
    summary:
      '你的测试结果显示你是深度连接型。你不爱泛泛之交，但认定的朋友你可以交心十年。聚会里你不是最吵的那个，却常常是散场后大家最想再见的那个。',
    detail: [
      '你的闪光点：倾听走心、秘密守得住，你的朋友安全感很高。',
      '社交真相：小而深的圈子，比大而浅的人脉更滋养你。',
      '给你的提醒：偶尔主动约人——好朋友也怕被你「忙」字劝退。',
    ],
  },
  'social-chameleon': {
    id: 'social-chameleon',
    title: '灵活切换型',
    tagline: '见什么人说什么话，是本事',
    summary:
      '你的测试结果显示你是灵活切换型。你能跟长辈聊养生、跟同事聊八卦、跟陌生人聊天气，切换自如毫不费力。你不是虚伪，你是天生懂得换位思考的社交高手。',
    detail: [
      '你的闪光点：极强的适配力，任何新环境你都能快速落位。',
      '社交真相：你的「看人下菜」其实是高阶共情。',
      '给你的提醒：在最能做自己的人面前，允许自己不切换。',
    ],
  },
  'social-observer': {
    id: 'social-observer',
    title: '安静观察型',
    tagline: '话不多，但什么都看在眼里',
    summary:
      '你的测试结果显示你是安静观察型。热闹是别人的，你负责看清全场：谁和谁走得近、谁话里有话，你心里门儿清。你开口不多，但一说就在点子上。',
    detail: [
      '你的闪光点：观察力与判断力，危机时刻你最冷静。',
      '社交真相：你的慢热筛掉了浮躁的人，留下的都是真交情。',
      '给你的提醒：想法别憋太久，说出来的正确才有价值。',
    ],
  },
}

const OPTIONS: Array<{ text: string; reportId: string }> = [
  { text: '主动开话题，把气氛带起来', reportId: 'social-spark' },
  { text: '找一两个投缘的人深聊', reportId: 'social-anchor' },
  { text: '见招拆招，什么人都能聊两句', reportId: 'social-chameleon' },
  { text: '先观察全场，看到眼里的再开口', reportId: 'social-observer' },
]

function q(text: string): TestDefinition['questions'][number] {
  return { text, options: OPTIONS.map((option) => ({ ...option })) }
}

export const SOCIAL_TEST: TestDefinition = {
  id: 'social-style',
  title: '社交人格测试',
  category: '情感',
  meta: { minutes: 3, resultLabel: '4 型 · 解析' },
  intro: [
    '聚会的角落里、群聊的潜水时、饭局的敬酒间——每个人在社交场里都有自己的「默认姿态」。有人天生自来熟，有人慢热但走心，有人八面玲珑，有人安静观察。',
    '12 道日常场景题，看清你在社交场里的天然角色。没有好坏，只有更懂自己的社交节奏。',
  ],
  notice: '该测试可免费测试+查看个人结果报告，包含社交风格解析与建议。感谢你的理解与支持。',
  questions: [
    q('进一个全是陌生人的饭局，你的第一反应？'),
    q('群里大家聊得火热，你通常？'),
    q('新同事入职第一天，你会？'),
    q('朋友聚会结束时，你的感受？'),
    q('别人介绍你时，你希望被怎么说？'),
    q('遇到观点冲突，你通常？'),
    q('你的微信好友数更接近？'),
    q('独处一整天没有社交，你会？'),
    q('电梯里遇到不太熟的同事，你会？'),
    q('团建被大家起哄来个节目，你会？'),
    q('新加入一个群聊，你前几天的状态是？'),
    q('接到陌生推销电话，你通常？'),
  ],
  scoring: {
    type: 'archetype',
    reports: ['social-spark', 'social-anchor', 'social-chameleon', 'social-observer'],
  },
  reports: REPORTS,
}
