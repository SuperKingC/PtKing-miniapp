import type { TestDefinition } from '../testEngine'

/**
 * 废柴天赋鉴定（archetype 模式）：20 题、每题在四种「废柴流派」间投票，最高票定型。
 * 「废柴」是自嘲向的爱称，四型全部长在无伤大雅的地方（锦鲤废柴/人间清醒废柴/睡神/气人天才），
 * 报告核心是「废得可爱、废得有价值」，纯趣味反差萌内容。
 */

const REPORTS: TestDefinition['reports'] = {
  'loser-lucky': {
    id: 'loser-lucky',
    title: '锦鲤废柴',
    tagline: '正经事全废，运气好到离谱',
    summary:
      '你是废柴界的天选之子：抽卡歪但出货、踩点但没迟到、临时抱佛脚但刚好只考划过的重点。技能点一窍不通，运气学满分——你的人生卡在「差点翻车」和「总能翻盘」之间反复横跳。',
    detail: [
      '你的天赋：玄学守恒，倒霉到一半就会自动触发幸运补丁。',
      '你的废点：计划能力约等于零，全靠运气兜底。',
      '给你的建议：别去研究概率学，会伤到锦鲤的仙气。',
    ],
  },
  'loser-clone': {
    id: 'loser-clone',
    title: '人间清醒废柴',
    tagline: '道理全懂，就是不想动',
    summary:
      '你是废柴里的哲学家：所有事你都看得明明白白——截止日期的残酷、拖延的代价、摆烂的结局。然后你选择躺下。你不是不知道路怎么走，你只是想先躺一会儿，躺得明明白白。',
    detail: [
      '你的天赋：人间清醒，随时能给别人的人生提出精准建议。',
      '你的废点：给完建议自己继续躺，知行合一缺一半。',
      '给你的建议：把「想清楚了再开始」改成「先开始再想」，动起来答案自己会出现。',
    ],
  },
  'loser-sleep': {
    id: 'loser-sleep',
    title: '究极睡神',
    tagline: '别人卷生卷死，你在睡觉，还赢了',
    summary:
      '你的废柴天赋是「睡」：地铁能睡、站票能睡、五分钟午休能梦游三界。睡神体质让你在全员内耗的时代保有最奢侈的资源——饱满的精神和吹弹可破的皮肤。这不是懒，这是天赋异禀。',
    detail: [
      '你的天赋：三秒入睡、站着也能补觉，睡眠质量碾压全场。',
      '你的废点：重要场合的「让我眯五分钟」，起来已是两小时后。',
      '给你的建议：把「睡不着」的朋友羡慕收好，然后继续睡，别谦虚。',
    ],
  },
  'loser-anger': {
    id: 'loser-anger',
    title: '气人天才',
    tagline: '一开口就让世界想报警，但就是让人恨不起来',
    summary:
      '你的废柴天赋是气人：歪楼、抬杠、在错误的时机说正确的话，气得别人血压升高，又因为你笑得真诚而被迫原谅。你是聚会氛围的变量，也是大家「又想打你又想带你玩」的快乐源泉。',
    detail: [
      '你的天赋：精准踩雷，一开口全场注意力+100%。',
      '你的废点：道歉速度跟不上气人速度。',
      '给你的建议：气完记得哄，你的真诚是你唯一的免死金牌。',
    ],
  },
}

export const LOSER_TEST: TestDefinition = {
  id: 'loser-talent',
  title: '废柴天赋鉴定',
  category: '趣味',
  meta: { minutes: 4, resultLabel: '4 型 · 隐藏废柴流派' },
  intro: [
    '每个废柴都不是真的废——只是你的天赋点错了树：有人点满了运气，有人点在了「睡」，有人点在「一开口全场血压升高」。废得精准，也是一种才能。',
    '20 道日常废柴现场题，鉴定你的隐藏废柴流派。测出哪种都不亏，毕竟能废得有特色，本身就是本事。',
  ],
  notice: '该测试为趣味自嘲向娱乐内容，可免费测试+查看个人结果报告。感谢你的理解与支持。',
  questions: [
    {
      text: 'deadline 逼近时，你的状态是？',
      options: [
        { text: '心一横：交给天意，我命由天不由我', reportId: 'loser-lucky' },
        { text: '一边焦虑一边刷手机，顺便想通了人生', reportId: 'loser-clone' },
        { text: '先睡一觉，醒来再说，睡着时烦恼不存在', reportId: 'loser-sleep' },
        { text: '四处问人怎么做，把全组都问烦了', reportId: 'loser-anger' },
      ],
    },
    {
      text: '抽奖/盲盒这件事，你通常是？',
      options: [
        { text: '随手一抽就是欧皇附体，朋友已经求你别抽了', reportId: 'loser-lucky' },
        { text: '算完概率觉得不划算，转身走人', reportId: 'loser-clone' },
        { text: '排队排到一半困了，先睡醒再说', reportId: 'loser-sleep' },
        { text: '给周围人疯狂安利，自己一张没中还被嫌', reportId: 'loser-anger' },
      ],
    },
    {
      text: '早起对来说你是？',
      options: [
        { text: '起晚了但刚好赶上车，运气这种东西很玄', reportId: 'loser-lucky' },
        { text: '闹钟定了 8 个，但道理上我并没有错——只是没起', reportId: 'loser-clone' },
        { text: '不存在起床问题，因为我就没觉得睡够过', reportId: 'loser-sleep' },
        { text: '起来后把全家的起床气都点了', reportId: 'loser-anger' },
      ],
    },
    {
      text: '朋友眼里的你，更像？',
      options: [
        { text: '人形锦鲤，有事就想拉你沾沾运气', reportId: 'loser-lucky' },
        { text: '嘴上全是道理，行动上全是躺平', reportId: 'loser-clone' },
        { text: '随时随地能睡着的移动休眠舱', reportId: 'loser-sleep' },
        { text: '又气人又好玩，还想再来一次的存在', reportId: 'loser-anger' },
      ],
    },
    {
      text: '你主导过最离谱的翻车现场是？',
      options: [
        { text: '忘带东西/坐过站，但最后总有惊无险', reportId: 'loser-lucky' },
        { text: '计划做得完美，执行时间被你拖没了', reportId: 'loser-clone' },
        { text: '约定时间睡过头，起床后一脸无辜', reportId: 'loser-sleep' },
        { text: '好心帮忙，帮完全场血压升高', reportId: 'loser-anger' },
      ],
    },
    {
      text: '面对「你能不能靠谱点」的质问，你会？',
      options: [
        { text: '「放心，关键时刻我总有高光」', reportId: 'loser-lucky' },
        { text: '「靠谱有什么用，开心最重要」', reportId: 'loser-clone' },
        { text: '（已经睡着了）', reportId: 'loser-sleep' },
        { text: '「我哪里不靠谱了？你说，我们现在就说清楚」', reportId: 'loser-anger' },
      ],
    },
    {
      text: '团建/聚会游戏环节，你的画风是？',
      options: [
        { text: '瞎玩乱玩，但奖品总莫名其妙归你', reportId: 'loser-lucky' },
        { text: '全程「这游戏没什么意义」但坐到最后', reportId: 'loser-clone' },
        { text: '找个沙发，三分钟进入睡眠', reportId: 'loser-sleep' },
        { text: '不按规则玩，把组织者气笑', reportId: 'loser-anger' },
      ],
    },
    {
      text: '你的「废柴时刻」通常发生在？',
      options: [
        { text: '越是关键时刻越掉链子，然后天降惊喜', reportId: 'loser-lucky' },
        { text: '想好了一切，最后败给了「懒得起身」', reportId: 'loser-clone' },
        { text: '任何有沙发、床、阳光的场合', reportId: 'loser-sleep' },
        { text: '开口的那一瞬间，全场安静', reportId: 'loser-anger' },
      ],
    },
    {
      text: '有人夸你的时候，你的反应是？',
      options: [
        { text: '「主要是运气好」，然后下次继续欧', reportId: 'loser-lucky' },
        { text: '「夸我也没用，我不会因此干活的」', reportId: 'loser-clone' },
        { text: '「谢谢，说完了我能睡会儿吗」', reportId: 'loser-sleep' },
        { text: '「那当然，也不看看我是谁」，把天聊死', reportId: 'loser-anger' },
      ],
    },
    {
      text: '你手机里最常出现的通知是？',
      options: [
        { text: '「您有一条新中奖通知」（别人没有的那种）', reportId: 'loser-lucky' },
        { text: '「您收藏的课程已过期」', reportId: 'loser-clone' },
        { text: '「您今天的睡眠报告已生成」', reportId: 'loser-sleep' },
        { text: '「您已被移出群聊」', reportId: 'loser-anger' },
      ],
    },
    {
      text: '理财/存钱这件事，你是？',
      options: [
        { text: '稀里糊涂总有点意外之财', reportId: 'loser-lucky' },
        { text: '看透了消费主义，然后继续月光', reportId: 'loser-clone' },
        { text: '钱花没花完不重要，觉睡好了就行', reportId: 'loser-sleep' },
        { text: '天天给朋友推荐理财，自己一毛不剩', reportId: 'loser-anger' },
      ],
    },
    {
      text: '朋友找你帮忙，你最可能给出的状态是？',
      options: [
        { text: '帮不上正忙，但刚好带来关键运气', reportId: 'loser-lucky' },
        { text: '口头支援一万句，行动支援零', reportId: 'loser-clone' },
        { text: '让TA先等等，你睡醒就到', reportId: 'loser-sleep' },
        { text: '一开口就把事聊砸，但提供了情绪价值', reportId: 'loser-anger' },
      ],
    },
    {
      text: '你的“三分钟热度”通常烧给？',
      options: [
        { text: '玄学：星座、塔罗、水逆退散', reportId: 'loser-lucky' },
        { text: '自律教程，收藏=学会', reportId: 'loser-clone' },
        { text: '助眠冥想——听着听着睡着了', reportId: 'loser-sleep' },
        { text: '新梗和吵嘴架素材', reportId: 'loser-anger' },
      ],
    },
    {
      text: '「你最近怎么样」——你的真实回答是？',
      options: [
        { text: '「说不清，但莫名其妙挺顺的」', reportId: 'loser-lucky' },
        { text: '「想明白了很多事，一件没干」', reportId: 'loser-clone' },
        { text: '「困」', reportId: 'loser-sleep' },
        { text: '「你先说你的，我等下抬杠」', reportId: 'loser-anger' },
      ],
    },
    {
      text: '被放鸽子时，你会？',
      options: [
        { text: '正好，一个人反而遇到了好事', reportId: 'loser-lucky' },
        { text: '内心毫无波澜，本来也懒得出门', reportId: 'loser-clone' },
        { text: '在约定地点睡了一觉，醒来已释怀', reportId: 'loser-sleep' },
        { text: '当场发疯文学，发完拉黑又解除', reportId: 'loser-anger' },
      ],
    },
    {
      text: '你的工位/房间一角通常长这样？',
      options: [
        { text: '堆着没拆的快递，里面总有惊喜', reportId: 'loser-lucky' },
        { text: '计划表、自律书籍，都还没拆封', reportId: 'loser-clone' },
        { text: '最整齐的是枕头', reportId: 'loser-sleep' },
        { text: '放着借走就没还的大家的东西', reportId: 'loser-anger' },
      ],
    },
    {
      text: '对你来说，「努力」这个词更像？',
      options: [
        { text: '不太需要，玄学自会安排', reportId: 'loser-lucky' },
        { text: '明天开始，真的，明天', reportId: 'loser-clone' },
        { text: '会消耗睡眠的行为，一律慎重', reportId: 'loser-sleep' },
        { text: '我努力的样子，主要是气人的样子', reportId: 'loser-anger' },
      ],
    },
    {
      text: '深夜 12 点，你通常在？',
      options: [
        { text: '又中奖了/又被免费抽中了，睡不着', reportId: 'loser-lucky' },
        { text: '思考人生，思考得特别清楚，明天全忘', reportId: 'loser-clone' },
        { text: '——这是凌晨，我在做梦', reportId: 'loser-sleep' },
        { text: '在群里发出没人接的暴论', reportId: 'loser-anger' },
      ],
    },
    {
      text: '你觉得自己最「废得其所」的地方是？',
      options: [
        { text: '废出好运，朋友都在蹭我的欧气', reportId: 'loser-lucky' },
        { text: '废得清醒，知道自己为什么躺', reportId: 'loser-clone' },
        { text: '废得健康，睡够八小时天下无敌', reportId: 'loser-sleep' },
        { text: '废得快乐，气人但被爱', reportId: 'loser-anger' },
      ],
    },
    {
      text: '如果废柴要评一个「终身成就奖」，你提名自己因为？',
      options: [
        { text: '运气常年在线，从未让期待落空', reportId: 'loser-lucky' },
        { text: '把「想明白」这件事做到了极致', reportId: 'loser-clone' },
        { text: '把睡觉睡成了一门艺术', reportId: 'loser-sleep' },
        { text: '气活了很多人，也被很多人爱着', reportId: 'loser-anger' },
      ],
    },
    {
      text: '别人说你「废」，你的内心独白是？',
      options: [
        { text: '「可我这运气，你羡慕不来」', reportId: 'loser-lucky' },
        { text: '「你才废，我这叫战略性躺平」', reportId: 'loser-clone' },
        { text: '「你说什么，我睡着了」', reportId: 'loser-sleep' },
        { text: '「你再说一遍？（掏出发疯素材本）」', reportId: 'loser-anger' },
      ],
    },
    {
      text: '新的一天开始，你的第一个念头是？',
      options: [
        { text: '「新的一天，运气也要营业了」', reportId: 'loser-lucky' },
        { text: '「今天也要接纳不努力的自己」', reportId: 'loser-clone' },
        { text: '「再五分钟，就五分钟」', reportId: 'loser-sleep' },
        { text: '「今天适合气人，已经开始物色对象了」', reportId: 'loser-anger' },
      ],
    },
  ],
  scoring: { type: 'archetype', reports: ['loser-lucky', 'loser-clone', 'loser-sleep', 'loser-anger'] },
  reports: REPORTS,
}
