import { Button, View } from '@tarojs/components'
import { MiniappTarotReadingBody } from './MiniappTarotReadingBody'
import type { TarotReading } from './tarotReading'

interface MiniappTarotReadingStageProps {
  reading: TarotReading
  onRestart(): void
  onClose(): void
}

export function MiniappTarotReadingStage({
  reading,
  onRestart,
  onClose,
}: MiniappTarotReadingStageProps) {
  return (
    <View className="miniapp-tarot__stage miniapp-tarot__reading">
      <MiniappTarotReadingBody reading={reading} />
      <View className="miniapp-tarot__reading-actions">
        <Button openType="share">分享给好友</Button>
        <Button onClick={onRestart}>再占一次</Button>
        <Button onClick={onClose}>退出</Button>
      </View>
    </View>
  )
}
