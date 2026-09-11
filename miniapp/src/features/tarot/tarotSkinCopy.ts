/**
 * 分皮肤流程指引文案：classic 保持现有措辞，clay 换成猫咪牌屋的猫口吻短句
 * （配合 .skin-clay .miniapp-tarot__hint 猫气泡样式）。
 * 仅覆盖 stage 标题与操作提示；按钮、牌阵名、解读文案两套皮肤共用。
 */
import type { TarotSkin } from './tarotSkin'

interface TarotStageCopy {
  questionTitle: string
  spreadTitle: string
  shuffleTitle: string
  shuffleHint(progress: number): string
  cutTitle: string
  cutHint(cutCount: number): string
  fanTitle(needCount: number): string
  fanHint(pickedCount: number, needCount: number): string
  revealTitle(allFlipped: boolean): string
}

const CLASSIC: TarotStageCopy = {
  questionTitle: '先写下你真正想知道的事',
  spreadTitle: '选择适合问题的牌阵',
  shuffleTitle: '长按牌堆洗牌，让心意融进牌里',
  shuffleHint: (progress) => `${Math.round(progress)}% · 松手可暂停，再次长按继续`,
  cutTitle: '凭直觉切一下牌',
  cutHint: (cutCount) => (cutCount > 0 ? `已切 ${cutCount} 次，还可以继续切牌` : '点击牌堆，每次完成一次切牌'),
  fanTitle: (needCount) => `心中默念问题，选出 ${needCount} 张牌`,
  fanHint: (pickedCount, needCount) => `已选 ${pickedCount}/${needCount}`,
  revealTitle: (allFlipped) => (allFlipped ? '牌已全部翻开' : '逐张点开，翻开你的牌'),
}

const CLAY: TarotStageCopy = {
  questionTitle: '想问点什么呢？告诉猫咪吧',
  spreadTitle: '今天的牌，想怎么摆？',
  shuffleTitle: '长按牌堆，跟猫咪一起静静心',
  shuffleHint: (progress) => `${Math.round(progress)}% · 松手歇口气，再按继续`,
  cutTitle: '凭直觉，轻轻切开这叠牌',
  cutHint: (cutCount) => (cutCount > 0 ? `已切 ${cutCount} 次，猫咪等你准备好` : '点一下牌堆，切几次都可以'),
  fanTitle: (needCount) => `闭眼想三秒，选出 ${needCount} 张牌`,
  fanHint: (pickedCount, needCount) => `已选 ${pickedCount}/${needCount} · 猫咪陪着你`,
  revealTitle: (allFlipped) => (allFlipped ? '牌都翻开啦' : '逐张点开，看看猫咪翻到了什么'),
}

export function getTarotStageCopy(skin: TarotSkin): TarotStageCopy {
  return skin === 'clay' ? CLAY : CLASSIC
}
