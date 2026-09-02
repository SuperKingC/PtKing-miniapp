import type { TestDefinition } from '../testEngine'

/**
 * 暗黑人格测试（factor 模式，27 题 × 每因素 9 题，约 8 分钟）。
 * 基于暗黑三联体（Dark Triad）研究框架的趣味化中文改编：
 * 掌控欲（马基雅维利主义方向）/ 自我中心（自恋方向）/ 冷漠冲动（精神病态方向，弱化表述）。
 * 合规与措辞：全篇去病理化——输出的是「人格风格倾向」而非任何疾病含义；反向描述降低社会期许偏差。
 */

const SCALE: TestDefinition['questions'][number]['options'] = [
  { text: '完全不同意' },
  { text: '不太同意' },
  { text: '比较同意' },
  { text: '完全同意' },
]

function item(desc: string, factorId: string, reverse = false): TestDefinition['questions'][number] {
  return {
    text: desc,
    options: SCALE.map((option, index) => {
      const agreement = index + 1
      const score = reverse ? 5 - agreement : agreement
      const weights: Record<string, number> = {}
      weights[factorId] = score
      return { text: option.text, factorWeights: weights }
    }),
  }
}

export const DARK_TRIAD_TEST: TestDefinition = {
  id: 'dark-triad',
  title: '暗黑人格测试',
  category: '人格',
  meta: { minutes: 8, resultLabel: '3 因素 · 暗黑剖析' },
  intro: [
    '心理学家发现，大多数人心里都住着一点「小暗黑」：对权力的兴趣、对关注的渴望、对他人情绪的钝感。暗黑三联体（Dark Triad）研究的正是这三股隐秘的潜流——它们不等于坏，用对了地方是魄力、魅力与果断。',
    '共 27 道态度题（约 8 分钟）。请诚实作答：这里没有旁观者，越诚实结果越有意思。',
  ],
  notice: '该测试基于暗黑三联体研究框架的娱乐化改编，结果为人格风格倾向参考，非任何临床含义；可免费测试+查看报告。',
  questions: [
    // 掌控欲（马基雅维利方向）9 题
    item('人与人之间的关系，本质上是一场资源博弈。', 'machiavelli'),
    item('合适的机会出现时，我愿意重新洗牌。', 'machiavelli'),
    item('我习惯提前布局，让别人按我的剧本走。', 'machiavelli'),
    item('大部分人对信息的处理能力，比我预期的差。', 'machiavelli'),
    item('我真心希望所有人都能坦诚相待。', 'machiavelli', true),
    item('我会为了长远目标放弃眼前的道德快感。', 'machiavelli'),
    item('「过程正义」比「结果有效」更重要。', 'machiavelli', true),
    item('我觉得撑起关系的是利益平衡，不是承诺。', 'machiavelli'),
    item('在博弈里，先动感情的那个人先输。', 'machiavelli'),
    // 自我中心（自恋方向）9 题
    item('我知道自己值得更多的关注。', 'narcissism'),
    item('走进房间时，我希望所有人注意到我。', 'narcissism'),
    item('我天生适合站在聚光灯下。', 'narcissism'),
    item('被夸奖时，我觉得理所当然。', 'narcissism'),
    item('我更喜欢做幕后英雄。', 'narcissism', true),
    item('和「平庸的大多数」相比，我一直有些特别。', 'narcissism'),
    item('我愿意被特别对待，因为我的确有特别之处。', 'narcissism'),
    item('别人的成功常常让我更能原谅自己的平凡。', 'narcissism', true),
    item('如果由我主导，那件事大概率会更好。', 'narcissism'),
    // 冷漠冲动（弱化的精神病态方向）9 题
    item('我做决定更多靠直觉，而不是权衡后果。', 'impulse'),
    item('别人的情绪很难真正影响我的判断。', 'impulse'),
    item('无聊的时候，我喜欢搞点「大动作」。', 'impulse'),
    item('风险让我兴奋多过让我犹豫。', 'impulse'),
    item('看电影落泪对我来说很常见。', 'impulse', true),
    item('朋友倾诉烦恼时，我内心其实在走神。', 'impulse'),
    item('报复的快感是真实的，我承认。', 'impulse'),
    item('规则对我更像建议，而非必须。', 'impulse'),
    item('我会为明天的快乐透支明天的麻烦。', 'impulse'),
  ],
  scoring: {
    type: 'factor',
    factors: [
      { id: 'machiavelli', label: '掌控欲' },
      { id: 'narcissism', label: '自我中心' },
      { id: 'impulse', label: '冷漠冲动' },
    ],
    reportByFactor: {
      machiavelli: 'dark-strategist',
      narcissism: 'dark-star',
      impulse: 'dark-wildcard',
    },
  },
  reports: {
    'dark-strategist': {
      id: 'dark-strategist',
      title: '执棋者',
      tagline: '你的暗黑面是「布局」',
      summary:
        '三股潜流中，你的「掌控欲」最突出。你看关系自带透视镜：谁需要什么、谁怕失去什么，你心里有图。这不是坏——军事、商业、谈判，人类文明的很多高级博弈靠的正是这种天赋。',
      detail: [
        '你的暗黑形态：不动声色的长期主义棋手，让局势朝你偏移。',
        '它的光明面：战略耐心与洞察力，危机里你是最冷静的操盘手。',
        '给你的提醒：赢下所有博弈的代价，可能是没人愿意陪你卸甲。',
      ],
    },
    'dark-star': {
      id: 'dark-star',
      title: '聚光灯本体',
      tagline: '你的暗黑面是「光芒」',
      summary:
        '三股潜流中，你的「自我中心」最突出。你渴望被看见、被记住、被谈论，而这份渴望恰恰是你魅力的引擎——没有人会为「无所谓」的东西拼命。',
      detail: [
        '你的暗黑形态：舞台中心的天然吸附力，锋芒从不打算收起来。',
        '它的光明面：自信与感染力，你能让平庸的场合闪闪发光。',
        '给你的提醒：聚光灯会灼人——记得把光分一点给身边的人。',
      ],
    },
    'dark-wildcard': {
      id: 'dark-wildcard',
      title: '脱缰野马',
      tagline: '你的暗黑面是「不定时」',
      summary:
        '三股潜流中，你的「冷漠冲动」最突出。你活在当下、边界松散、对风险的口味偏重；情绪在你这里更像天气而不是指令。你自由得让旁人羡慕，也让旁人头疼。',
      detail: [
        '你的暗黑形态：说走就走的心跳，和一副「关我什么事」的情绪护甲。',
        '它的光明面：极致的临场感与冒险精神，你的人生密度是别人的好几倍。',
        '给你的提醒：冲动是免费的，后果是收费的——付款前看一眼账单。',
      ],
    },
  },
}
