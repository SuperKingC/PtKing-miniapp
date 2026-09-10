import { useCallback, useEffect, useState } from 'react'
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import { APP_TAROT_SHARE_TITLE } from '../../services/brand'
import { MiniappTarotFlow } from '../../features/tarot/MiniappTarotFlow'
import { TAROT_HISTORY_OPEN_EVENT } from '../../features/tarot/tarotHistory'
import type { MiniappTarotSpread } from '../../features/tarot/tarotSpreads'
import { TAROT_FLOW_VISIBILITY_EVENT } from '../../custom-tab-bar/tabBarVisibility'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { useAppTheme } from '../../hooks/useAppTheme'
import { topInsetStyle } from '../../services/navMetrics'
import { tapFeedback } from '../../services/haptics'
import heroImage from '../../assets/illus/tarot-hero-v3.jpg'
import singleCardImage from '../../assets/illus/tarot-card-single-v2.png'
import cardsFanImage from '../../assets/illus/tarot-cards-fan-v2.png'
import './index.scss'

export default function TarotPage() {
  useTabBarSelected(1)
  const theme = useAppTheme()
  const [flowOpen, setFlowOpen] = useState(false)
  const [spread, setSpread] = useState<MiniappTarotSpread>('single')
  const [historyRequest, setHistoryRequest] = useState(0)
  const [tarotShareTitle, setTarotShareTitle] = useState('')

  useDidShow(() => {
    Taro.eventCenter.trigger(TAROT_FLOW_VISIBILITY_EVENT, flowOpen)
  })
  useEffect(() => {
    Taro.eventCenter.trigger(TAROT_FLOW_VISIBILITY_EVENT, flowOpen)
    return () => { Taro.eventCenter.trigger(TAROT_FLOW_VISIBILITY_EVENT, false) }
  }, [flowOpen])
  useEffect(() => {
    const openHistory = () => {
      setHistoryRequest((request) => request + 1)
      setFlowOpen(true)
    }
    Taro.eventCenter.on(TAROT_HISTORY_OPEN_EVENT, openHistory)
    return () => { Taro.eventCenter.off(TAROT_HISTORY_OPEN_EVENT, openHistory) }
  }, [])
  useShareAppMessage(() => {
    if (tarotShareTitle) return { title: tarotShareTitle }
    return { title: APP_TAROT_SHARE_TITLE }
  })
  const handleShareTitleChange = useCallback((title: string) => setTarotShareTitle(title), [])
  const startFlow = (selected: MiniappTarotSpread) => {
    tapFeedback()
    setSpread(selected)
    setHistoryRequest(0)
    setFlowOpen(true)
  }
  const closeFlow = () => {
    setFlowOpen(false)
    setHistoryRequest(0)
    setTarotShareTitle('')
  }

  return flowOpen ? (
    <View className="tarot-page">
      <MiniappTarotFlow initialSpread={spread} historyRequest={historyRequest} onClose={closeFlow} onShareTitleChange={handleShareTitleChange} />
    </View>
  ) : (
    <View className={`tab-page tarot-home-shell theme-${theme}`} style={topInsetStyle()}>
      <ScrollView className="tab-page__scroll" scrollY enhanced showScrollbar={false}>
        <View className="tarot-home">
          <View className="tarot-home__heading">
            <Text className="tarot-home__title">塔罗时光</Text>
            <Text className="tarot-home__subtitle">给此刻的自己一点启发</Text>
          </View>
          <Image className="tarot-home__hero" src={heroImage} mode="aspectFit" />
          <Button className="tarot-home__draw" onClick={() => startFlow('single')}>
            <Text className="tarot-home__draw-star">✦</Text>
            <Text className="tarot-home__draw-text">抽取今日指引</Text>
          </Button>
          <View className="tarot-home__entries">
            <View className="tarot-home__entry" hoverClass="pressable--pressed" onClick={() => startFlow('single')}>
              <Text className="tarot-home__entry-title">单张指引</Text>
              <Text className="tarot-home__entry-sub">快速获得指引</Text>
              <Image className="tarot-home__single-card" src={singleCardImage} mode="aspectFit" />
            </View>
            <View className="tarot-home__entry" hoverClass="pressable--pressed" onClick={() => startFlow('triple')}>
              <Text className="tarot-home__entry-title">三牌牌阵</Text>
              <Text className="tarot-home__entry-sub">深度探索指引</Text>
              <Image className="tarot-home__cards" src={cardsFanImage} mode="aspectFit" />
            </View>
          </View>
          <Text className="tarot-home__notice">仅供娱乐与自我探索</Text>
        </View>
      </ScrollView>
    </View>
  )
}
