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
import heroImage from '../../assets/illus/tarot-panel-v4.jpg'
import singleCardImage from '../../assets/illus/tarot-card-single-v3.png'
import cardsFanImage from '../../assets/illus/tarot-cards-fan-v3.png'
import './index.scss'

// 帘幕编排：合拢(布帘拉上/星星连线) → 帘后挂载流程（同时开始预加载）→
// hold 到资源加载完成（有仪式感下限，加载慢时由 loaded 触发）→ 淡出帘幕。
// 不与资源预加载耦合：慢网时帘幕内显示预加载进度，完成后淡入正式界面。
const CURTAIN_CLOSE_MS = 900
const CURTAIN_HOLD_MIN_MS = 500
const CURTAIN_OPEN_MS = 620

type CurtainPhase = 'idle' | 'closing' | 'holding' | 'opening'

export default function TarotPage() {
  useTabBarSelected(1)
  const theme = useAppTheme()
  const motionPreference = useMotionPreference()
  const [flowOpen, setFlowOpen] = useState(false)
  const [spread, setSpread] = useState<MiniappTarotSpread>('single')
  // 抽取今日指引在流程内保留选牌阵；两个入口卡已定牌阵，直接跳过该阶段
  const [chooseSpread, setChooseSpread] = useState(true)
  const [historyRequest, setHistoryRequest] = useState(0)
  const [tarotShareTitle, setTarotShareTitle] = useState('')
  const [skin, setSkinState] = useState<TarotSkin>(() => getTarotSkin())
  const [curtain, setCurtain] = useState<CurtainPhase>('idle')
  const curtainTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const holdStartRef = useRef(0)
  const reducedMotion = motionPreference === 'reduced'

  const clearCurtainTimers = () => {
    curtainTimersRef.current.forEach((timer) => clearTimeout(timer))
    curtainTimersRef.current = []
  }
  useEffect(() => () => clearCurtainTimers(), [])

  // hold 阶段等加载：加载完成(或超最短仪式时长)才淡出帘幕。loading 层兜底慢网。
  useEffect(() => {
    if (curtain !== 'holding') return
    if (!curtainLoaded) return
    const elapsed = Date.now() - holdStartRef.current
    const wait = Math.max(0, CURTAIN_HOLD_MIN_MS - elapsed)
    const timer = setTimeout(() => setCurtain('opening'), wait)
    return () => clearTimeout(timer)
  }, [curtain, curtainLoaded])

  // 慢网兜底：hold 最长等 12s，超时放行淡出，帘后流程内 loading 层继续显示进度
  useEffect(() => {
    if (curtain !== 'holding') return
    const timer = setTimeout(() => setCurtain('opening'), 12000)
    return () => clearTimeout(timer)
  }, [curtain])

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
  // 帘幕层显示的加载进度：流程组件预加载回调外抛，合拢/星显阶段读同一份值
  const [curtainProgress, setCurtainProgress] = useState(0)
  const [curtainLoaded, setCurtainLoaded] = useState(false)
  const handleLoadProgress = useCallback((progress: number) => {
    setCurtainProgress(progress)
    if (progress >= 1) setCurtainLoaded(true)
  }, [])
  const handleLoadDone = useCallback(() => setCurtainLoaded(true), [])

  const startFlow = (selected: MiniappTarotSpread, withSpreadStage = true) => {
    tapFeedback()
    setSpread(selected)
    setChooseSpread(withSpreadStage)
    setHistoryRequest(0)
    setCurtainProgress(0)
    setCurtainLoaded(false)
    if (reducedMotion) {
      setFlowOpen(true)
      return
    }
    // 帘幕关上(布帘拉上/星星连线)→ 帘后挂载流程(同时开始预加载) →
    // hold:加载完成或达最短仪式时长后由 effect 淡出帘幕露出流程页
    holdStartRef.current = Date.now()
    setCurtain('closing')
    curtainTimersRef.current.push(
      setTimeout(() => {
        setFlowOpen(true)
        setCurtain('holding')
      }, CURTAIN_CLOSE_MS),
    )
  }
  const closeFlow = () => {
    setFlowOpen(false)
    setHistoryRequest(0)
    setTarotShareTitle('')
    setCurtainProgress(0)
    setCurtainLoaded(false)
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
          <MiniappTarotFlow initialSpread={spread} chooseSpread={chooseSpread} historyRequest={historyRequest} onClose={closeFlow} onShareTitleChange={handleShareTitleChange} onLoadProgress={handleLoadProgress} onLoadDone={handleLoadDone} />
        </View>
      ) : (
        <View className={`tab-page tarot-home-shell theme-${theme}`} style={topInsetStyle()}>
          <ScrollView className="tab-page__scroll" scrollY enhanced showScrollbar={false}>
            <View className="tarot-home">
              {/* 参考图整面板：标题/副标题/月牙云朵三牌猫全部烘焙在图内 */}
              <Image className="tarot-home__hero" src={heroImage} mode="widthFix" />
              <Button className="tarot-home__draw" onClick={() => startFlow('single', true)}>
                <Text className="tarot-home__draw-star">✦</Text>
                <Text className="tarot-home__draw-text">抽取今日指引</Text>
              </Button>
              <View className="tarot-home__entries">
                <View className="tarot-home__entry" hoverClass="pressable--pressed" onClick={() => startFlow('single', false)}>
                  <Text className="tarot-home__entry-title">单张指引</Text>
                  <Text className="tarot-home__entry-sub">快速获得指引</Text>
                  <Image className="tarot-home__single-card" src={singleCardImage} mode="aspectFit" />
                </View>
                <View className="tarot-home__entry" hoverClass="pressable--pressed" onClick={() => startFlow('triple', false)}>
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
                      <View className={`tarot-home__skin-thumb tarot-home__skin-thumb--${option}`}>
                        {/* 原图放大铺满裁切：按皮肤主体位置上移裁切窗（clip 窗口 220rpx，图按满宽自然高） */}
                        <Image
                          className="tarot-home__skin-thumb-img"
                          src={getTarotSanctuaryBackground(option)}
                          mode="aspectFill"
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
            <View className="tarot-curtain__drape" />
            <View className="tarot-curtain__drape tarot-curtain__drape--b" />
            <Text className="tarot-curtain__star tarot-curtain__star--a">✦</Text>
            <Text className="tarot-curtain__star tarot-curtain__star--b">✦</Text>
            <Text className="tarot-curtain__star tarot-curtain__star--c">✦</Text>
          </View>
          <View className="tarot-curtain__panel tarot-curtain__panel--right">
            <View className="tarot-curtain__drape" />
            <View className="tarot-curtain__drape tarot-curtain__drape--b" />
            <Text className="tarot-curtain__star tarot-curtain__star--a">✦</Text>
            <Text className="tarot-curtain__star tarot-curtain__star--b">✦</Text>
            <Text className="tarot-curtain__star tarot-curtain__star--c">✦</Text>
          </View>
          {/* classic 星夜：星星逐颗亮起再连线成星座(纯 CSS 渐进绘制) */}
          {skin === 'classic' && (
            <>
              <View className="tarot-curtain__constellation">
                <View className="tarot-curtain__const-line" />
                <View className="tarot-curtain__const-line tarot-curtain__const-line--b" />
                <View className="tarot-curtain__const-line tarot-curtain__const-line--c" />
                <Text className="tarot-curtain__const-star tarot-curtain__const-star--1">✦</Text>
                <Text className="tarot-curtain__const-star tarot-curtain__const-star--2">✧</Text>
                <Text className="tarot-curtain__const-star tarot-curtain__const-star--3">✦</Text>
                <Text className="tarot-curtain__const-star tarot-curtain__const-star--4">✧</Text>
                <Text className="tarot-curtain__const-star tarot-curtain__const-star--5">✦</Text>
              </View>
              <View className="tarot-curtain__dream">
                <Text className="tarot-curtain__moon">☾</Text>
              </View>
            </>
          )}
          <View className="tarot-curtain__glow" />
          {skin === 'classic' && (
            <View className="tarot-curtain__glow tarot-curtain__glow--halo" />
          )}
          {/* 合拢后帘内加载进度：细进度条+百分比，完成后随帘幕淡出 */}
          {curtain !== 'opening' && (
            <View className="tarot-curtain__loading">
              <View className="tarot-curtain__loading-track">
                <View className="tarot-curtain__loading-fill" style={{ width: `${Math.round(curtainProgress * 100)}%` }} />
              </View>
              <Text className="tarot-curtain__loading-text">
                {curtainLoaded ? '仪式准备就绪' : `星图绘制中 ${Math.round(curtainProgress * 100)}%`}
              </Text>
            </View>
          )}
        </View>
      )}
    </>
  )
}
