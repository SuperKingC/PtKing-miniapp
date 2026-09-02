import type { TestDefinition } from '../testEngine'

/**
 * 职场角色测试（archetype 模式）：8 题、四类职场角色投票最高票。
 * 趣味向团队自我定位，不带能力高低评判。
 */

const REPORTS: TestDefinition['reports'] = {
  'work-captain': {
    id: 'work-captain',
    title: '掌舵者',
    tagline: '没有方向的事，交给我来定',
    summary:
      '你的职场角色是掌舵者。项目没方向时你敢拍板，团队混乱时你能拉齐。你天然对「目标」和「节奏」敏感，别人还在讨论时，你已经在排作战图了。',
    detail: [
      '你的闪光点：决断力与担当，出事不甩锅是你最大的信用。',
      '合作真相：你不是爱管人，你是受不了「没人管」。',
      '给你的提醒：多问一句「你们怎么看」，团队会跟得更死心塌地。',
    ],
  },
  'work-master': {
    id: 'work-master',
    title: '匠人',
    tagline: '方案可以过，但细节不能输',
    summary:
      '你的职场角色是匠人。交付质量是你的尊严：别人做到 80 分交差，你总忍不住再磨到 95。专业深度是你的护城河，也是团队敢接硬仗的底气。',
    detail: [
      '你的闪光点：硬核的专业力，难活碎活到你手里就稳了。',
      '合作真相：你较真的不是人，是「本可以更好」的遗憾。',
      '给你的提醒：先交付再完美——毕竟 deadline 不等磨刀。',
    ],
  },
  'work-glue': {
    id: 'work-glue',
    title: '黏合剂',
    tagline: '团队有没有战斗力，看气氛就知道',
    summary:
      '你的职场角色是黏合剂。你未必是声音最大的那个，但团队士气低落时是你兜住情绪，部门扯皮时是你穿针引线。你是团队真正的「隐形基础设施」。',
    detail: [
      '你的闪光点：信任感与协调力，同事有话愿意私下跟你说。',
      '合作真相：你维护的不是关系，是能让事情推进的「信任通道」。',
      '给你的提醒：别让自己的功劳总在隐形，该露面时也要露面。',
    ],
  },
  'work-spark': {
    id: 'work-spark',
    title: '点子王',
    tagline: '一个问题到你手里有五种解法',
    summary:
      '你的职场角色是点子王。例会上你的「我有个不成熟的小想法」常常是全场最有价值的发言。你受不了「一直这么干」，新工具新玩法你永远是第一批尝鲜的人。',
    detail: [
      '你的闪光点：创意与嗅觉，僵局里你最可能提供破局思路。',
      '合作真相：你不是不靠谱，你只是同时开了太多条线。',
      '给你的提醒：把最好的一个点子做完，胜过把十个点子讲完。',
    ],
  },
}

const OPTIONS: Array<{ text: string; reportId: string }> = [
  { text: '站出来定方向，排好分工', reportId: 'work-captain' },
  { text: '研究透细节，拿出最扎实的方案', reportId: 'work-master' },
  { text: '安抚情绪，把大家重新拧成一股绳', reportId: 'work-glue' },
  { text: '脑暴破局，抛出没人想过的思路', reportId: 'work-spark' },
]

function q(text: string): TestDefinition['questions'][number] {
  return { text, options: OPTIONS.map((option) => ({ ...option })) }
}

export const WORK_ROLE_TEST: TestDefinition = {
  id: 'work-role',
  title: '职场角色测试',
  category: '职场',
  meta: { minutes: 3, resultLabel: '4 型 · 解析' },
  intro: [
    '一个团队里有人掌舵、有人深耕、有人黏合、有人点火花——没有哪种角色更高级，只有位置放得对不对。看清自己的职场角色，发力才不拧巴。',
    '8 道职场场景题，找出你在团队里的天然位置。',
  ],
  notice: '该测试可免费测试+查看个人结果报告，包含职场角色解析与合作建议。感谢你的理解与支持。',
  questions: [
    q('项目陷入僵局，你本能先做什么？'),
    q('同事甩锅到你头上，你会？'),
    q('你最受不了的同事类型是？'),
    q('接手一个新任务，你最先关注？'),
    q('开会时你的存在感更像？'),
    q('加薪晋升的关键，你认为主要是？'),
    q('你工作里最有成就感的时刻是？'),
    q('同事会向你抱怨「工作里最受不了什么」？'),
  ],
  scoring: {
    type: 'archetype',
    reports: ['work-captain', 'work-master', 'work-glue', 'work-spark'],
  },
  reports: REPORTS,
}
