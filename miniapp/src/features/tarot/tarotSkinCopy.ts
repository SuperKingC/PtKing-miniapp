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

// clay：气泡里是测测子在说话——像一位守牌多年的行家，语气沉静、带点玄意：
// 不说「点击牌堆」这类操作指令，而是「落下一刀」「牌面自会应答」；实时进度并进同句。
// 状态行函数在 clay 不渲染（见 scss）。过审红线仍是禁「占卜/算命/改运」。
const CLAY: TarotStageCopy = {
  questionTitle: '把心里那句话交给我，牌都听得见',
  spreadTitle: '选一副牌阵，为今晚的问题铺开',
  shuffleTitle: (progress) => {
    if (progress >= 100) return '牌已洗净杂音，剩下的交给我'
    if (progress > 0) return `牌面泛起 ${Math.round(progress)}% 的光，松手歇一歇再按住`
    return '按住牌堆，让心里的话慢慢渗进牌里'
  },
  shuffleHint: () => '',
  cutTitle: (cutCount) => (cutCount > 0
    ? `已为你切过 ${cutCount} 次，想再落一刀也无妨`
    : '凭直觉落下一刀，剩下的交给我与牌'),
  cutHint: () => '',
  fanTitle: (needCount, pickedCount) => {
    if (pickedCount >= needCount) return '牌已就位，让我为你揭开它们'
    if (pickedCount > 0) return `已挑好 ${pickedCount} 张，还差 ${needCount - pickedCount} 张落进我掌心`
    return `让直觉带你挑出 ${needCount} 张牌，递到我掌心`
  },
  fanHint: () => '',
  revealTitle: (allFlipped) => (allFlipped ? '牌已尽数翻开，答案就在其中' : '翻开每一张，让我听牌面低语'),
}

export function getTarotStageCopy(skin: TarotSkin): TarotStageCopy {
  return skin === 'clay' ? CLAY : CLASSIC
}
