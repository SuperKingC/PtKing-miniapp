import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import type { DrawnTarotCard } from './tarotCards'
import { MiniappTarotCard } from './MiniappTarotCard'
import { getTarotSkin } from './tarotSkin'
import { getTarotStageCopy } from './tarotSkinCopy'

interface MiniappTarotRevealStageProps {
  drawn: DrawnTarotCard[]
  flipped: boolean[]
  onFlip(index: number): void
  onContinue(): void
}

export function MiniappTarotRevealStage({
  drawn,
  flipped,
  onFlip,
  onContinue,
}: MiniappTarotRevealStageProps) {
  const allFlipped = flipped.length > 0 && flipped.every(Boolean)
  const [ready, setReady] = useState(false)
  const copy = getTarotStageCopy(getTarotSkin())

  useEffect(() => {
    if (!allFlipped) {
      setReady(false)
      return
    }
    const timer = setTimeout(() => setReady(true), 500)
    return () => clearTimeout(timer)
  }, [allFlipped])

  return (
    <View className={`miniapp-tarot__stage miniapp-tarot__stage--reveal miniapp-tarot__stage--reveal-${drawn.length}`}>
      <Text className="miniapp-tarot__title">{copy.revealTitle(allFlipped)}</Text>
      <View className="miniapp-tarot__spacer miniapp-tarot__spacer--top" />
      <View className="miniapp-tarot__fit">
      <View className={drawn.length === 5 ? 'miniapp-tarot__reveal-row miniapp-tarot__reveal-row--5' : 'miniapp-tarot__reveal-row'}>
        {drawn.map((item, index) => (
          <Button
            key={`${item.card.id}-${index}`}
            className="miniapp-tarot__reveal-slot"
            disabled={flipped[index]}
            onClick={() => onFlip(index)}
          >
            <MiniappTarotCard drawn={item} flipped={flipped[index]} compact={drawn.length >= 5} />
          </Button>
        ))}
      </View>
      </View>
      <View className="miniapp-tarot__spacer" />
      <Button className="miniapp-tarot__next" disabled={!ready} onClick={onContinue}>
        {allFlipped ? '查看解读' : `已翻开 ${flipped.filter(Boolean).length}/${drawn.length}`}
      </Button>
    </View>
  )
}
