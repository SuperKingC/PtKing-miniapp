import { useState } from 'react'
import { Button, ScrollView, Text, View } from '@tarojs/components'
import { tapFeedback } from '../../services/haptics'
import { MiniappTarotReadingBody } from './MiniappTarotReadingBody'
import type { TarotReading } from './tarotReading'
import { findTarotSpread } from './tarotSpreads'

interface MiniappTarotHistoryPanelProps {
  history: TarotReading[]
  onClose(): void
}

function formatDate(value: string): string {
  const date = new Date(value)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function MiniappTarotHistoryPanel({ history, onClose }: MiniappTarotHistoryPanelProps) {
  const [selected, setSelected] = useState<TarotReading | null>(null)

  const closeDetail = () => {
    tapFeedback()
    setSelected(null)
  }

  return (
    <View className="miniapp-tarot-history">
      <View className="miniapp-tarot-history__backdrop" onClick={onClose} />
      <View className={selected ? 'miniapp-tarot-history__panel miniapp-tarot-history__panel--detail' : 'miniapp-tarot-history__panel'}>
        <Text className="miniapp-tarot-history__title">{selected ? '解读详情' : '我的解读记录'}</Text>
        <ScrollView
          className="miniapp-tarot-history__scroll"
          scrollY
          enhanced
          showScrollbar={false}
        >
          {selected ? (
            <View className="miniapp-tarot-history__detail">
              <MiniappTarotReadingBody reading={selected} />
            </View>
          ) : (
            <>
              {history.length === 0 && <Text className="miniapp-tarot__hint">还没有解读记录。</Text>}
              {history.map((item) => (
                <View
                  key={item.createdAt}
                  className="miniapp-tarot-history__item"
                  onClick={() => {
                    tapFeedback()
                    setSelected(item)
                  }}
                >
                  <View className="miniapp-tarot-history__item-meta">
                    <Text>{formatDate(item.createdAt)}</Text>
                    <Text>{findTarotSpread(item.spread).label}</Text>
                  </View>
                  <Text className="miniapp-tarot-history__item-question">{item.question}</Text>
                  <Text className="miniapp-tarot-history__item-cards">
                    {item.drawn.map((card) => `${card.card.name}(${card.reversed ? '逆' : '正'})`).join(' · ')}
                  </Text>
                  <Text className="miniapp-tarot-history__item-more">查看详情 ›</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
        {selected ? (
          <Button onClick={closeDetail}>返回记录</Button>
        ) : (
          <Button onClick={onClose}>关闭</Button>
        )}
      </View>
    </View>
  )
}
