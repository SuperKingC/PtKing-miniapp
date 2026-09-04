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
    deep: '锦鲤废柴的核心机制是「概率感知偏差 + 低焦虑行动」：你敢随手一抽、随便一试，心理上没有「必须成功」的枷锁——而低焦虑状态恰恰让人表现出更松弛的判断和更大胆的动作，心理学上叫「放松者红利」。你看起来运气好，部分原因是：敢买的人才会中奖，敢举手的人才会被看见。你的「废」体现在计划能力几乎为零，但你的「锦」体现在与不确定性共处的能力极强——别人怕翻车所以不敢上桌，你怕但上了，结果往往不差。锦鲤的暗面：运气是概率的礼物，不是能力的证明——别把玄学当技能，也别在关键时刻全押运气。',
    strengths: ['与不确定性共处的能力极强：天塌下来先睡一觉', '松弛感带来「放松者红利」：敢出手的人才有机会出手命中', '情绪成本低：你的人生没有「必须赢」的枷锁'],
    blindSpots: ['计划能力约等于零，全靠运气兜底不可持续', '把玄学当技能，关键时刻可能全押运气翻车', '幸运带来的机会常因「没准备」而接不住'],
    scenes: [
      { scene: '职场', text: '你的松弛适合对外拓展型任务：谈判、破冰、应急，你的「不慌」值钱。' },
      { scene: '恋爱', text: '你的好运是伴侣的定心丸，但重大决策请带上你的「清醒时刻」。' },
      { scene: '社交', text: '朋友抢你当锦鲤，记得偶尔用实力接住一次，惊喜加倍。' },
    ],
    actions: ['给运气配安全网：重要事项双备份，锦鲤也要懂風控。', '把「随手一试」的机会记录下来：你的命中率其实有数据可查。', '机会来临时用 24 小时补课：接不住的幸运等于没有。'],
  
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
    deep: '人间清醒废柴的核心是「认知与行动的剪刀差」：你的认知系统在线且优质——道理全懂、坑看得见、建议说得头头是道；但你的启动系统常常离线。心理学上这不叫懒，叫「知行分离」：动力系统有自己的逻辑，它不看「应该」，只看「想不想」。你的清醒反而可能加剧这个问题：因为看得太透，你知道努力的天花板、成功的概率、内卷的荒诞，于是启动成本显得格外高。但换个角度：你的「躺」是选择而非无能——你只是还没找到那件「不需要说服自己就想去干」的事。找到它，你的认知优势会瞬间变现。',
    strengths: ['认知质量高：你的建议常常比顾问靠谱', '情绪内耗少：想得开是你的核心竞争力', '看透规则的能力强，永远不会被画大饼收割'],
    blindSpots: ['知行分离：启动系统常年离线，想七分做零分', '清醒变成躺平的理由，「看透」成了不行动的许可证', '舒适区惯性大，改变的动力常常败给「明天再说」'],
    scenes: [
      { scene: '职场', text: '你的判断力适合做顾问、评审、把关角色：指点江山，你很值钱。' },
      { scene: '恋爱', text: '你的松弛让伴侣不焦虑，但TA也需要看到你为共同生活「动起来」。' },
      { scene: '社交', text: '朋友爱找你聊人生：你的清醒是稀缺资源，偶尔也开个价。' },
    ],
    actions: ['找那件「不需要说服自己就想去干」的事，你的认知优势会瞬间变现。', '把「先开始再想」设为实验：每月一个 5 分钟启动的最小项目。', '公开承诺法：把想做的事告诉朋友，用社交压力替你点火。'],
  
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
    deep: '究极睡神的核心是「睡眠系统的天赋异禀」：三秒入睡、倒头就着、坐高铁能睡过站——睡眠科学的视角看，你是「高睡眠驱动力 + 低睡前焦虑」的稀有组合。现代人最常见的睡眠问题（入睡困难、反刍、焦虑性失眠）在你这里全部不存在，你的大脑有一个干净的关机键。这带来的隐性收益被严重低估：睡眠质量直接决定情绪阈值、免疫水位和皮肤状态——你不用买最贵的精华，因为你睡的是最贵的觉。睡神的暗面：第一，时间的失控感——「眯五分钟」变成两小时，重要日程被睡眠劫持；第二，被贴上「懒」的标签，你的天赋被误读成不上进。',
    strengths: ['睡眠质量天花板：情绪阈值和免疫水位的隐形冠军', '睡前零焦虑：你的大脑有干净的关机键', '低成本养生：你睡出了别人花大钱买不到的状态'],
    blindSpots: ['时间失控：「眯五分钟」变成两小时，日程被睡眠劫持', '被误读为「懒」，天赋被贴上不上进的标签', '重要场合的入睡风险：会议、考试、长途转机'],
    scenes: [
      { scene: '职场', text: '你的恢复力适合高强度节奏的工作：别人靠咖啡续命，你靠小睡回血。' },
      { scene: '恋爱', text: '你的好脾气可能就是睡出来的：保持睡眠，就是维持关系的秘诀。' },
      { scene: '社交', text: '朋友羡慕你的睡眠，你是TA们眼中的「人生赢家」分支。' },
    ],
    actions: ['给「小睡」设闹钟硬上限：15 分钟，闹钟放必须起身才能关的地方。', '重要日程前设三重提醒：日历+闹钟+朋友互助。', '把「睡神体质」写进自我介绍：这是天赋，不是缺点。'],
  
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
    deep: '气人天才的核心是「精准踩雷的表达系统」：你不是不会说话，你是说话时默认运行「最出其不意」的算法——别人说东你有西，正经场合你冒金句，安慰人你先举例TA上次的糗事。你的气人不是恶意，是「幽默感跑偏了半拍」：你的大脑对「预期违背」的敏感度太高，笑点替代了分寸点。这让你成为群体里又想打你又想带你的存在——因为你的翻车自带喜剧效果，你的真诚又货真价实。气人天才的暗面：第一，关键场合的失言成本：面试、见家长、重要汇报，你的系统会自动爆梗；第二，亲密关系里，「气人」和「不尊重」的边界需要手刹。',
    strengths: ['喜剧天赋：你的翻车现场是朋友们的快乐源泉', '真诚打底：气完人的你笑得毫无攻击性，让人恨不起来', '社交记忆度高：你说过的话大家能笑一年'],
    blindSpots: ['关键场合的失言风险：面试/见家长/汇报前请手动降档', '「气人」与「冒犯」的边界模糊，偶尔真伤到人而不自知', '道歉速度跟不上气人速度，旧账在悄悄累积'],
    scenes: [
      { scene: '职场', text: '你是团队的氛围变量：创意会、团建、破冰，你的「离谱」常解死局。' },
      { scene: '恋爱', text: '伴侣是唯一需要你「收敛模式」的人：TA的底线要标记在地图上。' },
      { scene: '社交', text: '朋友爱你的搞笑，但TA们的严肃时刻也请认真接住。' },
    ],
    actions: ['建立「危险场合清单」：进名单的场合，发言前默数三秒。', '气完人 24 小时内必须哄：你的真诚是唯一的免死金牌，及时使用。', '把幽默感导向正产出：段子、文案、脱口秀，天赋值得一个舞台。'],
  
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
