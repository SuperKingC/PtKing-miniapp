import type { TestDefinition } from '../testEngine'

/**
 * 大五人格测试（factor 模式，30 题 × 每因素 6 题，约 8-10 分钟）。
 * 基于 Big Five / OCEAN 模型的趣味化中文改编：开放性/尽责性/外向性/宜人性/情绪稳定性。
 * 计分说明：情绪稳定性反向因素（题目按「神经质」方向表述，取反后展示「稳定性」）。
 * 严格心理测量学版需要专业常模，此处输出为百分位观感 + 主导特质解读，文案避免临床断言。
 */

const FIVE: Array<{ id: string; weights: [number, number, number, number] }> = [
  { id: 'openness', weights: [4, 3, 2, 1] },
  { id: 'conscientiousness', weights: [4, 3, 2, 1] },
  { id: 'extraversion', weights: [4, 3, 2, 1] },
  { id: 'agreeableness', weights: [4, 3, 2, 1] },
  { id: 'stability', weights: [4, 3, 2, 1] },
]

/** 认同该描述的程度选项（四点计分，无中性项——大五量表惯例） */
const SCALE: TestDefinition['questions'][number]['options'] = [
  { text: '非常不符合我' },
  { text: '不太符合我' },
  { text: '比较符合我' },
  { text: '非常符合我' },
]

/** 按因素方向把四点计分映射为该因素的权重（反向描述直接反转） */
function item(desc: string, factorId: string, reverse = false): TestDefinition['questions'][number] {
  return {
    text: desc,
    options: SCALE.map((option, index) => {
      const agreement = index + 1 // 1..4
      const score = reverse ? 5 - agreement : agreement
      const weights: Record<string, number> = {}
      weights[factorId] = score
      return { text: option.text, factorWeights: weights }
    }),
  }
}

export const BIGFIVE_TEST: TestDefinition = {
  id: 'bigfive',
  title: '大五人格测试',
  category: '人格',
  meta: { minutes: 10, resultLabel: '5 因素 · 剖析' },
  intro: [
    '大五人格（Big Five / OCEAN）是当代人格心理学公认的主流框架，用五个维度刻画一个人：开放性、尽责性、外向性、宜人性、情绪稳定性。它不像十六型那样给你贴标签，而是告诉你——每个维度上，你落在哪里。',
    '共 30 道描述题（约 8-10 分钟），请凭第一直觉作答，不要过度思考「哪个更好」：每个维度没有好坏，只有不同。',
  ],
  notice: '该测试基于大五人格理论的趣味化改编，仅供自我探索，非临床评估；可免费测试+查看个人结果报告。',
  questions: [
    // 开放性 O（6）
    item('我常常想象一些不寻常的可能性。', 'openness'),
    item('比起熟悉的东西，我更容易被新奇的概念吸引。', 'openness'),
    item('我喜欢琢磨抽象的概念和理论。', 'openness'),
    item('我对艺术、音乐或文学有自己的品味。', 'openness'),
    item('我习惯沿用老办法，不太琢磨新思路。', 'openness', true),
    item('我觉得哲学式的思考没什么用。', 'openness', true),
    // 尽责性 C（6）
    item('我做事情有计划，并按计划执行。', 'conscientiousness'),
    item('我的物品通常摆放得井井有条。', 'conscientiousness'),
    item('别人常说我是个可靠的人。', 'conscientiousness'),
    item('我经常拖到最后才开始动手。', 'conscientiousness', true),
    item('我做事情容易半途而废。', 'conscientiousness', true),
    item('细节上的疏漏常常让我不舒服。', 'conscientiousness'),
    // 外向性 E（6）
    item('在热闹的场合里，我的能量会被点亮。', 'extraversion'),
    item('我很容易主动和陌生人开启话题。', 'extraversion'),
    item('长时间独处会让我感到无趣。', 'extraversion'),
    item('我更喜欢待在幕后而不是成为焦点。', 'extraversion', true),
    item('人多的时候我通常比较安静。', 'extraversion', true),
    item('聚会结束后我常常感到精疲力尽。', 'extraversion', true),
    // 宜人性 A（6）
    item('我愿意花时间帮助真正需要帮助的人。', 'agreeableness'),
    item('我很难拒绝别人的请求。', 'agreeableness'),
    item('我倾向认为大多数人本质是善意的。', 'agreeableness'),
    item('讨论中把对方驳倒是件痛快的事。', 'agreeableness', true),
    item('我常常怀疑别人的动机。', 'agreeableness', true),
    item('被人占了便宜时，我会当场翻脸。', 'agreeableness', true),
    // 情绪稳定性 N（6，反向计分）
    item('我经常情绪波动比较大。', 'stability', true),
    item('小事也容易让我烦躁不安。', 'stability', true),
    item('我常常担心可能出的问题。', 'stability', true),
    item('我的情绪恢复得比较慢。', 'stability', true),
    item('压力大的时候我很难保持平静。', 'stability', true),
    item('我很少感到焦虑或紧张。', 'stability', false),
  ],
  scoring: {
    type: 'factor',
    // 注意：反向表述的题目已在 item() 定义侧反转计分，此处不再声明 reverse（避免双重取反）
    factors: [
      { id: 'openness', label: '开放性' },
      { id: 'conscientiousness', label: '尽责性' },
      { id: 'extraversion', label: '外向性' },
      { id: 'agreeableness', label: '宜人性' },
      { id: 'stability', label: '情绪稳定性' },
    ],
    reportByFactor: {
      openness: 'bigfive-explorer',
      conscientiousness: 'bigfive-architect',
      extraversion: 'bigfive-energizer',
      agreeableness: 'bigfive-guardian',
      stability: 'bigfive-steady',
    },
  },
  reports: {
    'bigfive-explorer': {
      id: 'bigfive-explorer',
      title: '开放性主导',
      tagline: '你的世界比别人的大一圈',
      summary:
        '五个维度中你的开放性最突出：好奇心、想象力与审美敏感是你的底色。你天然被新观念吸引，常规与套路会让你窒息。你适合一切允许「重新想象」的领域。',
      detail: [
        '你的画像：点子多、脑洞大，学新东西对你来说是娱乐。',
        '你的暗面：兴趣切换太快，完成度容易被新鲜感稀释。',
        '行动建议：给「想做的事」配一个「做完的事」清单，让好奇落地。',
      ],
    },
    'bigfive-architect': {
      id: 'bigfive-architect',
      title: '尽责性主导',
      tagline: '靠谱，是你最锋利的武器',
      summary:
        '五个维度中你的尽责性最突出：自律、条理与责任心是你的标志。你说到做到，计划性强，长期主义在你身上不是口号而是日常。',
      detail: [
        '你的画像：清单控、执行稳，别人放心的东西交给你。',
        '你的暗面：对自己高标准容易演变成自我苛责。',
        '行动建议：把「完成」和「完美」分开计分，允许 80 分交付。',
      ],
    },
    'bigfive-energizer': {
      id: 'bigfive-energizer',
      title: '外向性主导',
      tagline: '人群是你的充电站',
      summary:
        '五个维度中你的外向性最突出：热情、健谈、行动导向。社交对你不是消耗而是补给，你天然能把气氛和人连接起来。',
      detail: [
        '你的画像：主动、爱表达，独处太久会「没电」。',
        '你的暗面：兴奋时容易高估自己可持续的承诺。',
        '行动建议：每天留 20 分钟安静时间，把外放的能量收回一点点。',
      ],
    },
    'bigfive-guardian': {
      id: 'bigfive-guardian',
      title: '宜人性主导',
      tagline: '你是人群里天然的和平使者',
      summary:
        '五个维度中你的宜人性最突出：善意、信任与合作精神是你的底色。你在乎关系的质量，愿意先迈出理解的那一步。',
      detail: [
        '你的画像：共情强、口碑好，团队里的润滑剂。',
        '你的暗面：太好说话容易被人消耗，委屈往肚子里咽。',
        '行动建议：练习温和而坚定地说「不」，善良需要边界。',
      ],
    },
    'bigfive-steady': {
      id: 'bigfive-steady',
      title: '情绪稳定性主导',
      tagline: '泰山崩于前，你先分析崩的原因',
      summary:
        '五个维度中你的情绪稳定性最突出：抗压、冷静、情绪恢复快。风暴里你是那个「先别慌」的声音，这种特质在任何团队里都极其珍贵。',
      detail: [
        '你的画像：不轻易被情绪绑架，决策质量在压力下依然在线。',
        '你的暗面：太「稳」有时会被误读为不够在意。',
        '行动建议：记得向重要的人表达情绪信号，冷静不等于冷漠。',
      ],
    },
  },
}
