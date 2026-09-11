import { useCallback, useEffect, useRef, useState } from 'react'
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import { APP_TAROT_SHARE_TITLE } from '../../services/brand'
import { MiniappTarotFlow } from '../../features/tarot/MiniappTarotFlow'
import { TAROT_HISTORY_OPEN_EVENT } from '../../features/tarot/tarotHistory'
import type { MiniappTarotSpread } from '../../features/tarot/tarotSpreads'
import { getTarotSanctuaryBackground } from '../../features/tarot/tarotAssets'
import { getTarotSkin, setTarotSkin, TAROT_SKIN_LABELS, TAROT_SKIN_ORDER, type TarotSkin } from '../../features/tarot/tarotSkin'
import { TAROT_FLOW_VISIBILITY_EVENT } from '../../custom-tab-bar/tabBarVisibility'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { useAppTheme } from '../../hooks/useAppTheme'
import { useMotionPreference } from '../../hooks/useMotionPreference'
import { topInsetStyle } from '../../services/navMetrics'
import { tapFeedback } from '../../services/haptics'
import { trackEvent } from '../../services/monitor'
import heroImage from '../../assets/illus/tarot-panel-v2.jpg'
import singleCardImage from '../../assets/illus/tarot-card-single-v3.png'
import cardsFanImage from '../../assets/illus/tarot-cards-fan-v3.png'
import './index.scss'

// 帘幕编排：合拢 → 帘后挂载流程（同时开始预加载）→ 短暂停顿 → 拉开。
// 不与资源预加载耦合：慢网时帘开后由流程内既有 loading 百分比层接管。
const CURTAIN_CLOSE_MS = 420
const CURTAIN_HOLD_MS = 340
const CURTAIN_OPEN_MS = 560

type CurtainPhase = 'idle' | 'closing' | 'holding' | 'opening'

export default function TarotPage() {
  useTabBarSelected(1)
  const theme = useAppTheme()
  const motionPreference = useMotionPreference()
  const [flowOpen, setFlowOpen] = useState(false)
  const [spread, setSpread] = useState<MiniappTarotSpread>('single')
  const [historyRequest, setHistoryRequest] = useState(0)
  const [tarotShareTitle, setTarotShareTitle] = useState('')
  const [skin, setSkinState] = useState<TarotSkin>(() => getTarotSkin())
  const [curtain, setCurtain] = useState<CurtainPhase>('idle')
  const curtainTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const reducedMotion = motionPreference === 'reduced'

  const clearCurtainTimers = () => {
    curtainTimersRef.current.forEach((timer) => clearTimeout(timer))
    curtainTimersRef.current = []
  }
  useEffect(() => () => clearCurtainTimers(), [])

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
    if (reducedMotion) {
      setFlowOpen(true)
      return
    }
    // 帘幕关上再打开：合拢后帘后挂载流程，短暂停顿后滑开
    setCurtain('closing')
    curtainTimersRef.current.push(
      setTimeout(() => {
        setFlowOpen(true)
        setCurtain('holding')
      }, CURTAIN_CLOSE_MS),
      setTimeout(() => setCurtain('opening'), CURTAIN_CLOSE_MS + CURTAIN_HOLD_MS),
      setTimeout(() => setCurtain('idle'), CURTAIN_CLOSE_MS + CURTAIN_HOLD_MS + CURTAIN_OPEN_MS),
    )
  }
  const closeFlow = () => {
    setFlowOpen(false)
    setHistoryRequest(0)
    setTarotShareTitle('')
  }

  const changeSkin = (next: TarotSkin) => {
    if (next === skin) return
    tapFeedback()
    setSkinState(next)
    setTarotSkin(next)
    trackEvent('tarot_skin_change', { skin: next })
  }

  const curtainVisible = curtain !== 'idle'
  const curtainClass = [
    'tarot-curtain',
    `tarot-curtain--${skin}`,
    curtain !== 'idle' ? `tarot-curtain--${curtain}` : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      {flowOpen ? (
        <View
          className={[
            'tarot-page',
            curtain === 'opening' ? 'tarot-page--reveal' : '',
          ].filter(Boolean).join(' ')}
        >
          <MiniappTarotFlow initialSpread={spread} historyRequest={historyRequest} onClose={closeFlow} onShareTitleChange={handleShareTitleChange} />
        </View>
      ) : (
        <View className={`tab-page tarot-home-shell theme-${theme}`} style={topInsetStyle()}>
          <ScrollView className="tab-page__scroll" scrollY enhanced showScrollbar={false}>
            <View className="tarot-home">
              {/* 参考图整面板：标题/副标题/月牙云朵三牌猫全部烘焙在图内 */}
              <Image className="tarot-home__hero" src={heroImage} mode="widthFix" />
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
              <View className="tarot-home__skins">
                <Text className="tarot-home__skins-title">牌桌</Text>
                <View className="tarot-home__skin-row">
                  {TAROT_SKIN_ORDER.map((option) => (
                    <View
                      key={option}
                      className={[
                        'tarot-home__skin',
                        skin === option ? 'tarot-home__skin--active' : '',
                      ].filter(Boolean).join(' ')}
                      hoverClass="pressable--pressed"
                      onClick={() => changeSkin(option)}
                    >
                      <View className="tarot-home__skin-thumb">
                        {/* 底层放大铺满防露底，前景整图缩小入框：预览框仍铺满，场景完整可见 */}
                        <Image
                          className="tarot-home__skin-thumb-bg"
                          src={getTarotSanctuaryBackground(option)}
                          mode="aspectFill"
                        />
                        <Image
                          className="tarot-home__skin-thumb-fg"
                          src={getTarotSanctuaryBackground(option)}
                          mode="aspectFit"
                        />
                      </View>
                      <Text className="tarot-home__skin-name">{TAROT_SKIN_LABELS[option]}</Text>
                      {skin === option && <Text className="tarot-home__skin-check">✓</Text>}
                    </View>
                  ))}
                </View>
              </View>
              <Text className="tarot-home__notice">仅供娱乐与自我探索</Text>
            </View>
          </ScrollView>
        </View>
      )}
      {curtainVisible && (
        <View className={curtainClass} aria-hidden>
          <View className="tarot-curtain__panel tarot-curtain__panel--left">
            <Text className="tarot-curtain__star tarot-curtain__star--a">✦</Text>
            <Text className="tarot-curtain__star tarot-curtain__star--b">✦</Text>
            <Text className="tarot-curtain__star tarot-curtain__star--c">✦</Text>
          </View>
          <View className="tarot-curtain__panel tarot-curtain__panel--right">
            <Text className="tarot-curtain__star tarot-curtain__star--a">✦</Text>
            <Text className="tarot-curtain__star tarot-curtain__star--b">✦</Text>
            <Text className="tarot-curtain__star tarot-curtain__star--c">✦</Text>
          </View>
          <View className="tarot-curtain__glow" />
          {skin === 'classic' && (
            <View className="tarot-curtain__dream">
              <Text className="tarot-curtain__moon">☾</Text>
            </View>
          )}
        </View>
      )}
    </>
  )
}
