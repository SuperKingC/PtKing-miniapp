import type { TestDefinition } from '../testEngine'

/**
 * 憨憨指数测试（band 模式）：12 题、每题 0-3 分四档，总分 0-36 落三档。
 * 「憨憨指数」= 迷糊/脱线/天然呆浓度，猎奇向娱乐内容，无贬义——憨是可爱的代名词。
 * 总分 0-36（12 题 × 3 分），与全部 band 测试统一的三档刻度。
 */

const OPTIONS: TestDefinition['questions'][number]['options'] = [
  { text: '从没发生过', weight: 0 },
  { text: '偶尔发生', weight: 1 },
  { text: '经常发生', weight: 2 },
  { text: '这就是我的日常', weight: 3 },
]

function q(text: string): TestDefinition['questions'][number] {
  return { text, options: OPTIONS.map((option) => ({ ...option })) }
}

export const GOOFY_TEST: TestDefinition = {
  id: 'goofy',
  title: '憨憨指数测试',
  category: '趣味',
  meta: { minutes: 3, resultLabel: '3 档 · 憨度鉴定' },
  intro: [
    '出门忘带钥匙、进门找不到手机、别人笑完你才听懂笑话……「憨」不是傻，是一种天然的去油体质和快乐体质。',
    '12 道日常翻车现场题，测测你的憨度浓度。分数越高，说明你越接近快乐的本源。',
  ],
  notice: '该测试为趣味娱乐内容，可免费测试+查看个人结果报告。感谢你的理解与支持。',
  questions: [
    q('走进房间后忘了自己要来干嘛？'),
    q('话到嘴边，说出口变成另一个词？'),
    q('对着已经在找的东西发愁（它就在你手里/头上）？'),
    q('笑点慢半拍，别人笑完你才反应过来？'),
    q('出门之后又折返回去拿东西？'),
    q('把「昨天」说成「今天」、「下周一」记成「这周一」？'),
    q('认错人，还热情地打了招呼？'),
    q('被身边人当场指出「你又来了」的经典操作？'),
    q('发消息发错群，措手不及？'),
    q('一边说「我记性可好了」，一边当场忘了上一句说什么？'),
    q('出门带了伞，最后把伞落在了店里？'),
    q('给手机充了一整夜，早上发现插排没通电？'),
  ],
  scoring: {
    type: 'band',
    max: 36,
    bands: [
      { min: 0, max: 12, reportId: 'goofy-hidden' },
      { min: 13, max: 24, reportId: 'goofy-parttime' },
      { min: 25, max: 36, reportId: 'goofy-fulltime' },
    ],
  },
  reports: {
    'goofy-hidden': {
      id: 'goofy-hidden',
      title: '隐藏憨士',
      tagline: '憨度 10%：你严肃到有点无趣了',
      summary:
        '你的憨度浓度很低：记性在线、反应敏捷、翻车现场基本与你无关。但请注意——本测试的隐藏结论是：你的「不憨」可能是一种过度防御。适度憨一点，人生会松弛很多。',
      detail: [
        '你的优势：靠谱且回报率高，朋友有事第一个想到你。',
        '你的盲区：太怕出错，会让你错过很多好笑的瞬间。',
        '给你的建议：允许自己每周犯一次可爱的错，没人真的在意。',
      ],
    },
    'goofy-parttime': {
      id: 'goofy-parttime',
      title: '兼职憨憨',
      tagline: '憨度 50%：关键时刻靠谱，日常可爱翻车',
      summary:
        '你的憨度浓度恰到好处：正事上你稳如老狗，生活里你迷糊得恰到好处。同事信你、朋友爱你，因为你的憨全部长在无伤大雅的地方。',
      detail: [
        '你的优势：憨而不误事，这是普通人修行几十年的境界。',
        '你的萌点：翻车后理直气壮的样子，让人完全生气不起来。',
        '给你的建议：保持现状，你是「憨」的正确用法。',
      ],
    },
    'goofy-fulltime': {
      id: 'goofy-fulltime',
      title: '全职憨憨',
      tagline: '憨度 99%：你已憨成一种氛围',
      summary:
        '你的憨度浓度爆表：钥匙、手机、忘词、发错群……你的人生是一部长篇情景喜剧，而你是唯一不知道自己在演戏的演员。但说真的——快乐的人里，你的比例一定最高。',
      detail: [
        '你的优势：天然去油、自带笑点，你是朋友圈的情绪补给站。',
        '你的隐患：重要事项请双份备份，钥匙可以挂脖子上（不是）。',
        '给你的建议：憨是天赋，把重要的事设个提醒，让天赋只负责可爱。',
      ],
    },
  },
}
