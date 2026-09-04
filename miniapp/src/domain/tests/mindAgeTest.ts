import type { TestDefinition } from '../testEngine'

/**
 * 精神年龄测试（archetype 模式）：8 题、四档精神年龄投票最高票。
 * 趣味向内容：精神年龄与实际年龄无关，档位文案带反差萌。
 */

const REPORTS: TestDefinition['reports'] = {
  'mind-teen': {
    id: 'mind-teen',
    title: '精神年龄 16 岁',
    tagline: '永远热泪盈眶，永远好奇在线',
    summary:
      '你的精神年龄停在最好的年纪：对新事物永远好奇，情绪来得快去得也快，讨厌无聊胜过讨厌麻烦。你的世界里，「好玩」是重要的价值排序。',
    detail: [
      '你的优势：少年感是最贵的抗衰老，你周围的人也会被你点亮。',
      '真实写照：嘴上说躺平，遇到感兴趣的事比谁都拼。',
      '给你的提醒：16 岁可以不想明天，但成年人的你可以守护好这个 16 岁。',
    ],
  },
  'mind-twenties': {
    id: 'mind-twenties',
    title: '精神年龄 25 岁',
    tagline: '一半是火焰，一半是算力',
    summary:
      '你的精神年龄正值当打之年：还愿意冲动，但冲动前会查攻略；还相信热爱，但也盘算性价比。理想和现实在你身上达成了微妙停战。',
    detail: [
      '你的优势：进可攻退可守，活得又带劲又清醒。',
      '真实写照：收藏夹里一半是梦想，一半是教程。',
      '给你的提醒：偶尔别算性价比——有些事的意义就是「没意义但开心」。',
    ],
  },
  'mind-thirties': {
    id: 'mind-thirties',
    title: '精神年龄 35 岁',
    tagline: '情绪稳定，是你的超能力',
    summary:
      '你的精神年龄成熟稳重：事情来了先想解决方案而不是情绪，人际里讲究舒适距离，消费讲究「值得」。你是朋友圈里那个「靠谱得让人安心」的存在。',
    detail: [
      '你的优势：判断力和分寸感，危机时刻大家会先看你。',
      '真实写照：购物车放着很久，想清楚才下单，买回来说真香。',
      '给你的提醒：稳重不是不许崩溃，找个安全的地方做个孩子吧。',
    ],
  },
  'mind-sixties': {
    id: 'mind-sixties',
    title: '精神年龄 60 岁',
    tagline: '见过风浪，只想岁月静好',
    summary:
      '你的精神年龄通透豁达：很多曾经重要的事，现在你一句「无所谓」就放下了。养生枸杞保温杯可能提前配置，热闹的局能推就推，安静的日子最养人。',
    detail: [
      '你的优势：松弛感是稀缺资源，你的存在本身就是降压药。',
      '真实写照：年轻人熬夜追的剧，你收藏了，打算周末白天再看。',
      '给你的提醒：通透不等于封闭，偶尔疯一次，你值得。',
    ],
  },
}

const OPTIONS: Array<{ text: string; reportId: string }> = [
  { text: '太好了，冲！新鲜的东西最爱了', reportId: 'mind-teen' },
  { text: '先查查攻略，值得就去试试', reportId: 'mind-twenties' },
  { text: '看看对生活有没有实际影响再说', reportId: 'mind-thirties' },
  { text: '麻烦，别折腾，现在这样就挺好', reportId: 'mind-sixties' },
]

function q(text: string): TestDefinition['questions'][number] {
  return { text, options: OPTIONS.map((option) => ({ ...option })) }
}

export const MIND_AGE_TEST: TestDefinition = {
  id: 'mind-age',
  title: '精神年龄测试',
  category: '趣味',
  meta: { minutes: 3, resultLabel: '4 档 · 解析' },
  intro: [
    '身份证年龄没法选，但精神年龄是自己活出来的。有人 20 岁就爱养生，有人 50 岁还在追星——年龄只是数字，心态才是真相。',
    '12 道日常题，测测你的灵魂今年几岁。',
  ],
  notice: '该测试为趣味娱乐内容，可免费测试+查看个人结果报告。感谢你的理解与支持。',
  questions: [
    q('刷到最新的潮流玩意儿，你的反应是？'),
    q('熬夜追剧/看球，对你来说？'),
    q('朋友临时起意喊你出去玩，你通常？'),
    q('你如何看待「闲置物品断舍离」？'),
    q('听到父母/长辈的唠叨，你的感受？'),
    q('你在意别人对你的评价吗？'),
    q('你的消费观更接近？'),
    q('回忆学生时代，你更多是？'),
    q('手机系统提示更新，你会？'),
    q('朋友聊起你看不懂的新梗，你会？'),
    q('搬家收拾东西，你的风格是？'),
    q('对「稳定」这个词，你的感觉是？'),
  ],
  scoring: {
    type: 'archetype',
    reports: ['mind-teen', 'mind-twenties', 'mind-thirties', 'mind-sixties'],
  },
  reports: REPORTS,
}
