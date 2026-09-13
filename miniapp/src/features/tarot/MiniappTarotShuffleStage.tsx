import { useEffect, useRef, useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import { impactFeedback, startPulseHaptics, stopPulseHaptics } from '../../services/haptics'
import { getTarotCardBack, resolveTarotAssetUrl } from './tarotAssets'
import { getTarotSkin } from './tarotSkin'
import { getTarotStageCopy } from './tarotSkinCopy'

interface MiniappTarotShuffleStageProps {
  progress: number
  onProgress(progress: number): void
  onContinue(): void
  onSkip(): void
}

const shuffleDurationMs = 3000

export function MiniappTarotShuffleStage({
  progress,
  onProgress,
  onContinue,
  onSkip,
}: MiniappTarotShuffleStageProps) {
  const skin = getTarotSkin()
  const copy = getTarotStageCopy(skin)
  const timerRef = useRef(0)
  const startTimeRef = useRef(0)
  const startProgressRef = useRef(0)
  const completedRef = useRef(progress >= 100)
  const [isShuffling, setIsShuffling] = useState(false)

  const stop = () => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current)
    timerRef.current = 0
    setIsShuffling(false)
    stopPulseHaptics()
  }

  const start = () => {
    if (timerRef.current) return
    setIsShuffling(true)
    startPulseHaptics()
    startTimeRef.current = Date.now()
    startProgressRef.current = progress
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current
      const next = Math.min(100, startProgressRef.current + (elapsed / shuffleDurationMs) * 100)
      if (next >= 100 && !completedRef.current) {
        completedRef.current = true
        impactFeedback('heavy')
      }
      onProgress(next)
      timerRef.current = requestAnimationFrame(tick)
    }
    timerRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => stop, [])

  return (
    <View className="miniapp-tarot__stage miniapp-tarot__stage--ritual miniapp-tarot__stage--shuffle">
      <Text className="miniapp-tarot__title">{copy.shuffleTitle(progress)}</Text>
      <View className="miniapp-tarot__spacer miniapp-tarot__spacer--top" />
      <Button
        className={`miniapp-tarot__shuffle-deck${isShuffling ? ' miniapp-tarot__shuffle-deck--active' : ''}${progress >= 100 && !isShuffling ? ' miniapp-tarot__shuffle-deck--complete' : ''}`}
        aria-label="长按洗牌"
        onTouchStart={start}
        onTouchEnd={stop}
        onTouchCancel={stop}
      >
        {Array.from({ length: 10 }, (_, index) => (
          <View key={index} className={`miniapp-tarot__deck-card miniapp-tarot__deck-card--${index + 1}`}>
            <Image src={resolveTarotAssetUrl(getTarotCardBack(skin))} mode="aspectFit" fadeIn={false} />
          </View>
        ))}
        <View className="miniapp-tarot__shuffle-orbit miniapp-tarot__shuffle-orbit--outer" />
        <View className="miniapp-tarot__shuffle-orbit miniapp-tarot__shuffle-orbit--inner" />
        <View className="miniapp-tarot__shuffle-rune">✦</View>
        <View className="miniapp-tarot__shuffle-burst" />
      </Button>
      <View className="miniapp-tarot__spacer" />
      <View className="miniapp-tarot__shuffle-bar">
        <View style={{ width: `${progress}%` }} />
      </View>
      <Text className="miniapp-tarot__hint">{copy.shuffleHint(progress)}</Text>
      <Button className="miniapp-tarot__next" disabled={progress < 100} onClick={onContinue}>
        {progress < 100 ? '继续洗牌…' : '下一步 · 切牌'}
      </Button>
      <Button className="miniapp-tarot__text-action" onClick={onSkip}>跳过洗牌与切牌</Button>
    </View>
  )
}
