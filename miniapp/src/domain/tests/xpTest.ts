import type { TestDefinition } from '../testEngine'

/**
 * XP 测试（archetype 模式）：20 题、每题在四种「心动触发器」间投票，最高票定型。
 * 「XP」取网络语境里的「让你上头的点」，内容全程走心动/氛围/偏好原型，不涉低俗表述（合规红线）。
 * 四型：反差感（意外性）、氛围感（场景情绪）、灵魂共振（同频感）、独占欲（专属感）。
 */

const REPORTS: TestDefinition['reports'] = {
  'xp-contrast': {
    id: 'xp-contrast',
    title: '反差感收藏家',
    tagline: '你的心动开关，长在「意外」上',
    summary:
      '你的 XP 是反差感：冷脸的人突然心软、强势的人只对你低头、一贯稳的人为你失了分寸——这种「不在预期内」的瞬间最让你上头。你吃的从来不是人设，是人设裂开的那条缝。',
    detail: [
      '你的开关：前一刻 A 面拉满，后一刻只对你 B 面。',
      '你的雷区：一眼望到底的「完美人设」，反倒让你无感。',
      '小提醒：现实里的反差是稀有限定款，遇到了别只顾着上头，记得珍惜。',
    ],
  },
  'xp-atmos': {
    id: 'xp-atmos',
    title: '氛围感雷达',
    tagline: '光线刚好、风也刚好，心就动了',
    summary:
      '你的 XP 是氛围感：你对场景、光线、语气、情绪浓度极度敏感。让你心动的往往不是某个具体的人，而是「那个人+那个瞬间」合成的氛围场。氛围一到位，你的心理防线自动降一半。',
    detail: [
      '你的开关：黄昏、路灯、副驾、深夜电台——氛围搭好了，人就更发光。',
      '你的雷区：再好看的人，在没有氛围的场景里也点不着你。',
      '小提醒：警惕「滤镜心动」，氛围散去后记得看看灯下真实的那个人。',
    ],
  },
  'xp-resonance': {
    id: 'xp-resonance',
    title: '灵魂共振型选手',
    tagline: '聊得来，是最高级的心动',
    summary:
      '你的 XP 是同频感：一句话接住你的梗、一个眼神读懂你的欲言又止，比什么都致命。你上头的从来不是脸，是「这个人居然和我用同一个频道思考」的震动感。懂你，就是你的致命吸引。',
    detail: [
      '你的开关：聊到一半同时打出同一句话的瞬间。',
      '你的雷区：再好看的脸，聊三句就暴露不同频，你会立刻下头。',
      '小提醒：共振难得，但别忘了心动也需要行动去接，别停在「聊得来」。',
    ],
  },
  'xp-claim': {
    id: 'xp-claim',
    title: '独占欲验收官',
    tagline: '要的不是好，是「只对我好」',
    summary:
      '你的 XP 是专属感：对谁都温柔的人让你无感，但「例外感」直接命中你——规则为你在意的人弯曲、偏爱有看得见的证据。你要的不是被喜欢，是被区别对待地喜欢。',
    detail: [
      '你的开关：同样的待遇摆在一起，你那份永远特殊。',
      '你的雷区：一视同仁的温柔，在你这里约等于零。',
      '小提醒：专属感很甜，但健康的关系需要边界，别把「查证偏爱」当成爱的日常。',
    ],
  },
}

export const XP_TEST: TestDefinition = {
  id: 'xp-test',
  title: 'XP 测试',
  category: '情感',
  meta: { minutes: 4, resultLabel: '4 型 · 心动触发器' },
  intro: [
    '「XP」是网络语境里「让你上头的点」——它决定了你会被什么样的人一击即中，又在什么瞬间彻底沦陷。',
    '20 道心动场景题，测出你的心动触发器：有人吃反差、有人吃氛围、有人吃同频、有人吃专属感。找到它，你就读懂了自己的心动逻辑。',
  ],
  notice: '该测试为趣味向内容，可免费测试+查看个人结果报告。感谢你的理解与支持。',
  questions: [
    {
      text: '人群里哪种人最容易让你多看两眼？',
      options: [
        { text: '全场高冷，唯独对你露出一点破绽', reportId: 'xp-contrast' },
        { text: '站在光线和音乐都刚刚好的地方', reportId: 'xp-atmos' },
        { text: '开口第一句就接住了你没说出口的话', reportId: 'xp-resonance' },
        { text: '对谁都淡淡的，只有给你留了专属位置', reportId: 'xp-claim' },
      ],
    },
    {
      text: '哪种「回复消息」最让你心动？',
      options: [
        { text: '一贯毒舌的人，突然发来笨拙的关心', reportId: 'xp-contrast' },
        { text: '深夜发来一句「睡了吗」，配着刚好的BGM感', reportId: 'xp-atmos' },
        { text: '你们同时打出了一模一样的一句话', reportId: 'xp-resonance' },
        { text: '「别人问都没回，就等你这句」', reportId: 'xp-claim' },
      ],
    },
    {
      text: '让你瞬间上头的名场面是？',
      options: [
        { text: '稳如泰山的人，为你慌了神', reportId: 'xp-contrast' },
        { text: '雨夜共撑一把伞，谁都没说话', reportId: 'xp-atmos' },
        { text: '聊到凌晨三点，发现三观严丝合缝', reportId: 'xp-resonance' },
        { text: 'TA 当众说「这个只能给TA」', reportId: 'xp-claim' },
      ],
    },
    {
      text: '你更容易被哪种朋友圈吸引？',
      options: [
        { text: '日常高冷，偶尔露出反差萌的瞬间', reportId: 'xp-contrast' },
        { text: '随手一拍全是电影感的氛围图', reportId: 'xp-atmos' },
        { text: '评论区里你们聊得根本停不下来', reportId: 'xp-resonance' },
        { text: '发的东西像加密电报，只有你看得懂', reportId: 'xp-claim' },
      ],
    },
    {
      text: '对方哪个小动作最致命？',
      options: [
        { text: '板了一天的脸，看到你绷不住笑了', reportId: 'xp-contrast' },
        { text: '在喧闹里压低声音，只对你说', reportId: 'xp-atmos' },
        { text: '精准接住你的烂梗，还顺势往下接', reportId: 'xp-resonance' },
        { text: '不动声色把你不喜欢的东西换掉了', reportId: 'xp-claim' },
      ],
    },
    {
      text: '理想中的「偶遇」剧本是？',
      options: [
        { text: '一贯理智的人，在意外场合失态地追上来', reportId: 'xp-contrast' },
        { text: '黄昏的路灯下，逆光站着一个模糊又好看的人', reportId: 'xp-atmos' },
        { text: '在旧书店同时伸手拿了同一本书', reportId: 'xp-resonance' },
        { text: 'TA说「我知道你会出现在这里」', reportId: 'xp-claim' },
      ],
    },
    {
      text: '你吃哪一套「吃醋」？',
      options: [
        { text: '平时云淡风轻的人阴阳怪气', reportId: 'xp-contrast' },
        { text: '气氛降到冰点，空气里都是安静', reportId: 'xp-atmos' },
        { text: '逻辑清晰地跟你辩「你昨天多看了TA一眼」', reportId: 'xp-resonance' },
        { text: '直接宣布主权，眼神全是「是我的」', reportId: 'xp-claim' },
      ],
    },
    {
      text: '什么样的「偏爱证据」最打动你？',
      options: [
        { text: '说不在乎，却记得你所有随口一提', reportId: 'xp-contrast' },
        { text: '为你把普通的一天布置出仪式感', reportId: 'xp-atmos' },
        { text: '把「只有你懂」的秘密讲给你听', reportId: 'xp-resonance' },
        { text: '排队的队伍里，永远先给你留位置', reportId: 'xp-claim' },
      ],
    },
    {
      text: '哪种「道歉」会让你瞬间原谅？',
      options: [
        { text: '从不说软话的人，别扭地说了软话', reportId: 'xp-contrast' },
        { text: '带你去你们第一次见面的那家店', reportId: 'xp-atmos' },
        { text: '把你生气的点逐条复盘并给出方案', reportId: 'xp-resonance' },
        { text: '「我可以对全世界嘴硬，除了你」', reportId: 'xp-claim' },
      ],
    },
    {
      text: '你更容易记住对方的？',
      options: [
        { text: '那个和平时判若两人的瞬间', reportId: 'xp-contrast' },
        { text: '某次对视时空气里的静电感', reportId: 'xp-atmos' },
        { text: '某句让你愣住三秒的话', reportId: 'xp-resonance' },
        { text: 'TA给你的独一无二的称呼', reportId: 'xp-claim' },
      ],
    },
    {
      text: '聊天时哪种「频率」最让你上头？',
      options: [
        { text: '高冷的人突然开启话痨模式', reportId: 'xp-contrast' },
        { text: '深夜的音乐分享，不说话也舒服', reportId: 'xp-atmos' },
        { text: '梗接梗、逻辑对逻辑，全程火花', reportId: 'xp-resonance' },
        { text: '「这条消息只发给你一个人」', reportId: 'xp-claim' },
      ],
    },
    {
      text: '让你「破防」的瞬间更接近？',
      options: [
        { text: '永远赢的人，在你这里认了输', reportId: 'xp-contrast' },
        { text: '陌生人海里，TA隔着人群看向你', reportId: 'xp-atmos' },
        { text: '你藏得很深的心事，被一句话说中', reportId: 'xp-resonance' },
        { text: 'TA偷偷为你破例了原则', reportId: 'xp-claim' },
      ],
    },
    {
      text: '对方状态不好时，你希望TA？',
      options: [
        { text: '平时逞强的人，终于肯对你说「我不好」', reportId: 'xp-contrast' },
        { text: '拉你走进黑夜的海边吹风', reportId: 'xp-atmos' },
        { text: '和你复盘到天亮，聊通为止', reportId: 'xp-resonance' },
        { text: '只允许你一个人陪着', reportId: 'xp-claim' },
      ],
    },
    {
      text: '你理想中的关系进展是？',
      options: [
        { text: '从针锋相对到防线的裂缝慢慢裂开', reportId: 'xp-contrast' },
        { text: '在一次次刚刚好的氛围里水到渠成', reportId: 'xp-atmos' },
        { text: '聊着聊着，突然发现已经谁也离不开谁', reportId: 'xp-resonance' },
        { text: '从「特殊对待」开始，名分后置', reportId: 'xp-claim' },
      ],
    },
    {
      text: '哪种「沉默」最让你心动？',
      options: [
        { text: '想说什么又嘴硬咽回去的沉默', reportId: 'xp-contrast' },
        { text: '并排坐着，夜风和心跳都刚刚好的沉默', reportId: 'xp-atmos' },
        { text: '一个眼神就完成三句话信息的沉默', reportId: 'xp-resonance' },
        { text: '「我不说，但你知道我只对你这样」的沉默', reportId: 'xp-claim' },
      ],
    },
    {
      text: ' TA 记住了你的什么，最让你心动？',
      options: [
        { text: '你假装不在意、其实很在意的点', reportId: 'xp-contrast' },
        { text: '你提过的那家店、那首歌、那部电影', reportId: 'xp-atmos' },
        { text: '你自己都没意识到的思维习惯', reportId: 'xp-resonance' },
        { text: '你不喜欢什么——然后全部避开', reportId: 'xp-claim' },
      ],
    },
    {
      text: '心动有味道的话，你的那杯是？',
      options: [
        { text: '先苦后回甘、入口意外的特调', reportId: 'xp-contrast' },
        { text: '窗边、雨天、热美式的氛围组合', reportId: 'xp-atmos' },
        { text: '和你上次聊到的那杯一模一样', reportId: 'xp-resonance' },
        { text: '菜单上没有、只为你特调的一杯', reportId: 'xp-claim' },
      ],
    },
    {
      text: '对方发来消息，哪种开头最让你想回？',
      options: [
        { text: '「我平时不会跟别人说这个，但是……」', reportId: 'xp-contrast' },
        { text: '「今天的晚霞，像我们那天看到的」', reportId: 'xp-atmos' },
        { text: '「我刚想到一个话题，只有你聊得来」', reportId: 'xp-resonance' },
        { text: '「问你个事，别人问我不答」', reportId: 'xp-claim' },
      ],
    },
    {
      text: '让你念念不忘的人，通常自带？',
      options: [
        { text: '一道只有你能看见的裂缝', reportId: 'xp-contrast' },
        { text: '一段和TA绑定在一起的氛围记忆', reportId: 'xp-atmos' },
        { text: '再也没人能接住的聊天频率', reportId: 'xp-resonance' },
        { text: '一个只属于你的特殊身份', reportId: 'xp-claim' },
      ],
    },
    {
      text: '如果给心动拍个特写镜头，画面是？',
      options: [
        { text: '冷脸的人在转身后偷偷笑了', reportId: 'xp-contrast' },
        { text: '逆光里TA的轮廓和扬起的灰尘', reportId: 'xp-atmos' },
        { text: '两张同时被手机照亮、笑出声的脸', reportId: 'xp-resonance' },
        { text: 'TA越过一整群人，把东西递给了你', reportId: 'xp-claim' },
      ],
    },
  ],
  scoring: { type: 'archetype', reports: ['xp-contrast', 'xp-atmos', 'xp-resonance', 'xp-claim'] },
  reports: REPORTS,
}
