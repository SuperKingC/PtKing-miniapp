import type { TestDefinition } from '../testEngine'

/**
 * 天赋能力测试（archetype 模式）：8 题、四类天赋人格投票最高票。
 * 趣味向自我认知内容，不做能力评估承诺。
 */

const REPORTS: TestDefinition['reports'] = {
  'gift-creator': {
    id: 'gift-creator',
    title: '创造力天赋',
    tagline: '你的脑子自带一块空白画布',
    summary:
      '你的天赋指向创造力。别人看到的是「事物本身」，你看到的是「它还能变成什么」：新组合、新玩法、新表达。你适合一切从零到一的工作与爱好。',
    detail: [
      '典型表现：脑子里的点子比手快，看到常规做法就想换个方式。',
      '适配方向：写作、设计、策划、产品、一切需要「无中生有」的事。',
      '发挥建议：定期把点子「 dump 」出来——写下来比留在脑子里值钱。',
    ],
  },
  'gift-empath': {
    id: 'gift-empath',
    title: '共情力天赋',
    tagline: '你自带一台情绪雷达',
    summary:
      '你的天赋指向共情力。空气里一点细微的情绪变化你都接收得到，朋友有话总愿意跟你说。你适合一切「与人打交道」并让人变好的事情。',
    detail: [
      '典型表现：别人还没说完，你已经懂了；气氛不对你最先察觉。',
      '适配方向：陪伴、教育、内容、用户视角的工作，团队的黏合剂。',
      '发挥建议：共情是天赋也是耗电项，记得给自己留独处充电时间。',
    ],
  },
  'gift-logic': {
    id: 'gift-logic',
    title: '逻辑力天赋',
    tagline: '你的世界是一张因果关系网',
    summary:
      '你的天赋指向逻辑力。你天然喜欢找规律、搭框架、问「为什么」，混乱的局面到你手里总能被理清楚。你适合一切需要分析与系统构建的事。',
    detail: [
      '典型表现：听人说话自动抓重点，做决定习惯列利弊。',
      '适配方向：分析、规划、技术、流程优化，团队的军师。',
      '发挥建议：逻辑之外留点余地——不是所有事都能被推导。',
    ],
  },
  'gift-action': {
    id: 'gift-action',
    title: '行动力天赋',
    tagline: '你想三分钟就敢上手干一分钟',
    summary:
      '你的天赋指向行动力。想法再多不落地等于零，而你最强的就是落地：敢于开始、扛得住试错、越挫越勇。你适合一切「需要有人先干起来」的事。',
    detail: [
      '典型表现：等不了完美时机，先干起来再调整。',
      '适配方向：执行、开拓、竞技、一切需要冲进去的场合。',
      '发挥建议：冲之前花三分钟想清楚退路，你的成功率会更夸张。',
    ],
  },
}

const OPTIONS: Array<{ text: string; reportId: string }> = [
  { text: '琢磨点子，想想还能怎么玩', reportId: 'gift-creator' },
  { text: '观察大家的情绪和气氛', reportId: 'gift-empath' },
  { text: '分析利弊，找规律和逻辑', reportId: 'gift-logic' },
  { text: '直接上手试试，边做边看', reportId: 'gift-action' },
]

function q(text: string): TestDefinition['questions'][number] {
  return { text, options: OPTIONS.map((option) => ({ ...option })) }
}

export const GIFT_TEST: TestDefinition = {
  id: 'gift',
  title: '天赋能力测试',
  category: '人格',
  meta: { minutes: 4, resultLabel: '4 型 · 解析' },
  intro: [
    '每个人都有自己的「出厂设置」：有人天生爱琢磨新点子，有人天然接得住情绪，有人看见混乱就想理逻辑，有人想到就敢干。',
    '20 道日常场景题，帮你找到自己的天赋主战场——不是给自己设限，而是知道在哪里发力最省力。',
  ],
  notice: '该测试可免费测试+查看个人结果报告，包含天赋类型与发挥建议。感谢你的理解与支持。',
  questions: [
    q('参加一个新活动，你最先做的是？'),
    q('朋友遇到难题来找你，你通常？'),
    q('你更喜欢的工作节奏是？'),
    q('面对一堆没做完的事，你会？'),
    q('你刷手机时最常看的内容是？'),
    q('团队里大家最常夸你哪一点？'),
    q('学一样新东西，你更看重？'),
    q('空下来的一天，你更想？'),
    q('拿到一个新工具或新应用，你最先做什么？'),
    q('朋友纠结两难来问你，你通常会？'),
    q('计划外的空白时间突然砸来，你会？'),
    q('计划被打乱时，你的第一反应是？'),
    q('拿到一堆积木或拼图，你会？'),
    q('朋友要做一个糟糕的决定，你会？'),
    q('你送礼物时的思考方式是？'),
    q('看到别人做得比你更好，第一反应？'),
    q('学新技能时，你的方法是？'),
    q('你的房间或工位更像？'),
    q('半夜冒出的灵感，你会？'),
    q('到一个新地方，你会先？'),
  ],
  scoring: { type: 'archetype', reports: ['gift-creator', 'gift-empath', 'gift-logic', 'gift-action'] },
  reports: REPORTS,
}
