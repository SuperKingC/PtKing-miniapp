/**
 * 分皮肤流程指引文案：classic 保持现有措辞（标题在上、状态行在底部分开渲染），
 * clay 把两者合成一句测测子（店猫）口吻的话，作为猫头顶那枚对话气泡。
 * 仅覆盖 stage 标题与操作提示；按钮、牌阵名、解读文案两套皮肤共用。
 * 过审约束：用户可见文案禁「占卜/算命/改运」（tarotCopy.test.ts 把关）；
 * 猫一律称「测测子」，不再用「猫咪」泛称。
 */
import type { TarotSkin } from './tarotSkin'

interface TarotStageCopy {
  questionTitle: string
  spreadTitle: string
  // clay 的仪式/选牌/翻牌阶段只渲染标题这一枚气泡，状态并进同句；
  // classic 沿用「标题在上、状态行在底」的旧结构（标题忽略入参）。
  shuffleTitle(progress: number): string
  shuffleHint(progress: number): string
  cutTitle(cutCount: number): string
  cutHint(cutCount: number): string
  fanTitle(needCount: number, pickedCount: number): string
  fanHint(pickedCount: number, needCount: number): string
  revealTitle(allFlipped: boolean): string
}

const CLASSIC: TarotStageCopy = {
  questionTitle: '先写下你真正想知道的事',
  spreadTitle: '选择适合问题的牌阵',
  shuffleTitle: () => '长按牌堆洗牌，让心意融进牌里',
  shuffleHint: (progress) => `${Math.round(progress)}% · 松手可暂停，再次长按继续`,
  cutTitle: () => '凭直觉切一下牌',
  cutHint: (cutCount) => (cutCount > 0 ? `已切 ${cutCount} 次，还可以继续切牌` : '点击牌堆，每次完成一次切牌'),
  fanTitle: (needCount) => `心中默念问题，选出 ${needCount} 张牌`,
  fanHint: (pickedCount, needCount) => `已选 ${pickedCount}/${needCount}`,
  revealTitle: (allFlipped) => (allFlipped ? '牌已全部翻开' : '逐张点开，翻开你的牌'),
}

// clay：气泡里是测测子在说话——用第一人称邀请，实时进度并进同句，
// 不再是「操作提示 + 状态行」两段拼接。状态行函数在 clay 不渲染（见 scss）。
const CLAY: TarotStageCopy = {
  questionTitle: '想问点什么呢？告诉测测子吧',
  spreadTitle: '今天的牌，想怎么摆？',
  shuffleTitle: (progress) => {
    if (progress >= 100) return '牌都洗香啦，接下来交给我吧'
    if (progress > 0) return `已经洗到 ${Math.round(progress)}% 啦，松手歇口气再按住`
    return '按住牌堆别松手，我帮你把牌洗得香香的'
  },
  shuffleHint: () => '',
  cutTitle: (cutCount) => (cutCount > 0
    ? `你切了 ${cutCount} 次啦，想再来一下我也等你`
    : '凭直觉轻轻切开这叠牌，我都听你的'),
  cutHint: () => '',
  fanTitle: (needCount, pickedCount) => {
    if (pickedCount >= needCount) return '挑好啦，让我帮你翻开吧'
    if (pickedCount > 0) return `已经挑好 ${pickedCount} 张啦，还差 ${needCount - pickedCount} 张给我`
    return `心里想着问题，挑出 ${needCount} 张牌递给我吧`
  },
  fanHint: () => '',
  revealTitle: (allFlipped) => (allFlipped ? '都翻开啦，我帮你记在心里咯' : '点开看看，我帮你翻到了什么'),
}

export function getTarotStageCopy(skin: TarotSkin): TarotStageCopy {
  return skin === 'clay' ? CLAY : CLASSIC
}
