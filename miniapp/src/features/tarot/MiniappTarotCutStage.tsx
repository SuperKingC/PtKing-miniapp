import { useEffect } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import { getTarotCardBack, resolveTarotAssetUrl } from './tarotAssets'
import { getTarotSkin } from './tarotSkin'
import { getTarotStageCopy } from './tarotSkinCopy'

interface MiniappTarotCutStageProps {
  cutCount: number
  cutting: boolean
  onStartCut(): void
  onFinishCut(): void
  onContinue(): void
  onSkip(): void
}

function CutPile() {
  const skin = getTarotSkin()
  return (
    <View className="miniapp-tarot__cut-pile">
      {Array.from({ length: 10 }, (_, index) => (
        <View key={index} className="miniapp-tarot__cut-sheet" style={{ top: `${index * 3}rpx` }} />
      ))}
      <View className="miniapp-tarot__cut-face">
        <Image src={resolveTarotAssetUrl(getTarotCardBack(skin))} mode={skin === 'clay' ? 'aspectFit' : 'aspectFill'} fadeIn={false} />
      </View>
    </View>
  )
}

export function MiniappTarotCutStage({
  cutCount,
  cutting,
  onStartCut,
  onFinishCut,
  onContinue,
  onSkip,
}: MiniappTarotCutStageProps) {
  const skin = getTarotSkin()
  const copy = getTarotStageCopy(skin)
  useEffect(() => {
    if (!cutting) return
    const timer = setTimeout(onFinishCut, 520)
    return () => clearTimeout(timer)
  }, [cutting, onFinishCut])

  return (
    <View className="miniapp-tarot__stage miniapp-tarot__stage--ritual miniapp-tarot__stage--cut">
      <Text className="miniapp-tarot__title">{copy.cutTitle(cutCount)}</Text>
      <View className="miniapp-tarot__spacer miniapp-tarot__spacer--top" />
      <Button
        className={[
          'miniapp-tarot__cut-deck',
          cutting ? 'miniapp-tarot__cut-deck--cutting' : '',
          cutCount % 2 === 1 ? 'miniapp-tarot__cut-deck--swapped' : '',
        ].filter(Boolean).join(' ')}
        disabled={cutting}
        onClick={onStartCut}
      >
        <View className="miniapp-tarot__cut-half miniapp-tarot__cut-half--left"><CutPile /></View>
        <View className="miniapp-tarot__cut-half miniapp-tarot__cut-half--right"><CutPile /></View>
      </Button>
      <View className="miniapp-tarot__spacer" />
      <Text className="miniapp-tarot__hint">
        {copy.cutHint(cutCount)}
      </Text>
      <Button className="miniapp-tarot__next" disabled={cutCount === 0 || cutting} onClick={onContinue}>
        完成切牌 · 进入选牌
      </Button>
      <Button className="miniapp-tarot__text-action" disabled={cutting} onClick={onSkip}>跳过切牌</Button>
    </View>
  )
}
