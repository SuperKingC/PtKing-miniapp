import type { TestDefinition } from '../testEngine'

/**
 * 内耗指数测试（band 模式）：12 题、每题 0-3 分四档，总分 0-36 落三档报告。
 * 趣味向自我觉察工具，文案避免「诊断/筛查」等临床措辞（合规红线）。
 */

const OPTIONS: TestDefinition['questions'][number]['options'] = [
  { text: '几乎不会', weight: 0 },
  { text: '偶尔这样', weight: 1 },
  { text: '经常这样', weight: 2 },
  { text: '简直是我', weight: 3 },
]

function q(text: string): TestDefinition['questions'][number] {
  return { text, options: OPTIONS.map((option) => ({ ...option })) }
}

export const OVERTHINK_TEST: TestDefinition = {
  id: 'overthink',
  title: '内耗指数测试',
  category: '趣味',
  meta: { minutes: 3, resultLabel: '3 档 · 建议' },
  intro: [
    '想太多、睡不好、别人一句话能琢磨一整天？内耗更像一种「心理摩擦力」——事情还没开始，能量已经耗掉一半。',
    '12 道日常场景题，3 分钟测出你最近的心理摩擦程度，并附上对应的小建议。',
  ],
  notice: '该测试为趣味自我觉察工具，非医疗评估；可免费测试+查看个人结果报告。',
  questions: [
    q('睡前，脑子还在回放白天的对话？'),
    q('发出去的消息会反复检查好几遍？'),
    q('别人一句无心的话，你能想很久？'),
    q('做决定之后，常后悔「要是选另一个」？'),
    q('明明很累，但停下来就会有负罪感？'),
    q('社交之后，感觉像跑了八百米？'),
    q('还没开始做一件事，就开始担心搞砸？'),
    q('对人发消息前，会先在脑子里演练？'),
    q('事情已经做完，你还会反复检查有没有疏漏？'),
    q('消息已读不回，你会脑补出各种原因？'),
    q('要当众发言之前，心会先提起来？'),
    q('坏结果还没发生，你已经预演了好几遍？'),
  ],
  scoring: {
    type: 'band',
    max: 36,
    bands: [
      { min: 0, max: 12, reportId: 'overthink-low' },
      { min: 13, max: 24, reportId: 'overthink-mid' },
      { min: 25, max: 36, reportId: 'overthink-high' },
    ],
  },
  reports: {
    'overthink-low': {
      id: 'overthink-low',
      title: '轻装上阵',
      tagline: '心里不装事，睡着了就真放下了',
      summary: `你的内耗程度很低。事情过去了就翻篇，别人的话不过夜，你的能量基本都用在「往前走」而不是「来回想」上。这是很健康的心理状态，保持住。`,
      detail: [
        '你的优势：行动力没被「想太多」拖住，遇事先做再说。',
        '保持秘诀：该吃吃该睡睡，别把「不内耗」也变成新焦虑。',
        '小提醒：偶尔复盘是好事，但别越界变成自我攻击。',
      ],
    },
    'overthink-mid': {
      id: 'overthink-mid',
      title: '中等摩擦',
      tagline: '大脑常在空转，还好你有所察觉',
      summary: `你的内耗处于中等水平。大多数时候你能正常运转，但在压力、社交和重要决定面前，大脑容易「空转」——想得多、做得慢、睡前纠结。好消息是：这个阶段的内耗最容易通过小习惯改善。`,
      detail: [
        '典型信号：决定后反刍、对他人评价敏感、休息时有负罪感。',
        '小建议：给纠结设个时限——十分钟想不出结果就先做最小的一步。',
        '小建议：睡前把担心写在纸上封起来，明天的你去处理。',
      ],
    },
    'overthink-high': {
      id: 'overthink-high',
      title: '重度空转',
      tagline: '事情还没发生，能量已耗掉一半',
      summary: `你的内耗程度偏高。你可能经常感到「明明什么都没做，但特别累」——那是大脑在后台同时运行太多担忧线程。这份报告不是给你贴标签，而是提醒你：是时候给自己松松绑了。`,
      detail: [
        '第一优先：保证睡眠。内耗最耗的是睡眠，而睡眠不足又放大内耗。',
        '小建议：把「担心清单」和「行动清单」分开，只对后者动手。',
        '小建议：每天留 15 分钟什么都不做的发呆时间，这不是偷懒，是维护。',
      ],
    },
  },
}
