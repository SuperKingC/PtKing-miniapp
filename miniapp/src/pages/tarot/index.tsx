import { useCallback, useEffect, useRef, useState } from 'react'
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import { APP_TAROT_SHARE_TITLE } from '../../services/brand'
import { MiniappTarotFlow } from '../../features/tarot/MiniappTarotFlow'
import { TAROT_HISTORY_OPEN_EVENT } from '../../features/tarot/tarotHistory'
import type { MiniappTarotSpread } from '../../features/tarot/tarotSpreads'
import { getTarotSanctuaryBackground, isUsableTarotAssetUrl } from '../../features/tarot/tarotAssets'
import { getTarotSkin, setTarotSkin, TAROT_SKIN_LABELS, TAROT_SKIN_ORDER, type TarotSkin } from '../../features/tarot/tarotSkin'
import { TAROT_FLOW_VISIBILITY_EVENT } from '../../custom-tab-bar/tabBarVisibility'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { useAppTheme } from '../../hooks/useAppTheme'
import { useMotionPreference } from '../../hooks/useMotionPreference'
import { topInsetStyle } from '../../services/navMetrics'
import { tapFeedback } from '../../services/haptics'
import { trackEvent } from '../../services/monitor'
import heroImage from '../../assets/illus/tarot-panel-v6.jpg'
import singleCardImage from '../../assets/illus/tarot-card-single-v4.png'
import cardsFanImage from '../../assets/illus/tarot-cards-fan-v4.png'
import './index.scss'

// 帘幕编排：合拢(布帘拉上/星星连线，期间帘后已挂载流程并预加载) →
// hold 到资源加载完成(不设最短仪式时长，资源好即放行；合拢耗时本身兜底) → 淡出帘幕。
// 不与资源预加载耦合：慢网时帘幕内显示预加载进度，完成后淡入正式界面。
const CURTAIN_CLOSE_MS = 420
const CURTAIN_HOLD_MIN_MS = 0
const CURTAIN_OPEN_MS = 360

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

  // hold 阶段等加载：资源完成即放行淡出(不设最短仪式时长，合拢本身已兜底)。
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

  // opening 淡出播完后彻底卸载帘幕节点：WXSS 同节点 class 切换的 opacity 动画
  // 在模拟器上实测不重放（淡出类挂上后帘幕仍不透明），卸载是确定性兜底
  useEffect(() => {
    if (curtain !== 'opening') return
    const timer = setTimeout(() => setCurtain('idle'), CURTAIN_OPEN_MS + 80)
    return () => clearTimeout(timer)
  }, [curtain])

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
    // 底栏随帘幕出现即藏：不等帘后流程挂载，先广播流程可见(底栏 ownRoute 判塔罗即藏)
    Taro.eventCenter.trigger(TAROT_FLOW_VISIBILITY_EVENT, true)
    if (reducedMotion) {
      setFlowOpen(true)
      return
    }
    // 帘幕关上(布帘拉合/星显连线)→ 帘后挂载流程(同时开始预加载) →
    // hold:加载完成即快进淡出(只保 160ms 呼吸底线)，慢网 12s 兜底放行
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
    Taro.eventCenter.trigger(TAROT_FLOW_VISIBILITY_EVENT, false)
  }

  const changeSkin = (next: TarotSkin) => {
    if (next === skin) return
    tapFeedback()
    setSkinState(next)
    setTarotSkin(next)
    trackEvent('tarot_skin_change', { skin: next })
  }

  const skinThumbSrc = (option: TarotSkin): string => {
    const remote = getTarotSanctuaryBackground(option)
    // COS 资产根未配置时（占位域名/空），缩略图请求必然失败留白，退回包内 hero 兜底
    return isUsableTarotAssetUrl(remote) ? remote : heroImage
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
                        {/* 原图放大铺满裁切：按皮肤主体位置上移裁切窗（clip 窗口 220rpx，图按满宽自然高）。
                            COS 资产根未配置（本地开发/未发布）时退回包内 hero——否则缩略图整块空白 */}
                        <Image
                          className="tarot-home__skin-thumb-img"
                          src={skinThumbSrc(option)}
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
            <View className="tarot-curtain__drape tarot-curtain__drape--c" />
            <View className="tarot-curtain__valance">
              <View className="tarot-curtain__valance-scallop" />
              <View className="tarot-curtain__valance-scallop tarot-curtain__valance-scallop--b" />
              <View className="tarot-curtain__valance-scallop tarot-curtain__valance-scallop--c" />
              <View className="tarot-curtain__tassel tarot-curtain__tassel--a" />
              <View className="tarot-curtain__tassel tarot-curtain__tassel--b" />
            </View>
            <Text className="tarot-curtain__star tarot-curtain__star--a">✦</Text>
            <Text className="tarot-curtain__star tarot-curtain__star--b">✦</Text>
            <Text className="tarot-curtain__star tarot-curtain__star--c">✦</Text>
          </View>
          <View className="tarot-curtain__panel tarot-curtain__panel--right">
            <View className="tarot-curtain__drape" />
            <View className="tarot-curtain__drape tarot-curtain__drape--b" />
            <View className="tarot-curtain__valance">
              <View className="tarot-curtain__valance-scallop" />
              <View className="tarot-curtain__valance-scallop tarot-curtain__valance-scallop--b" />
              <View className="tarot-curtain__valance-scallop tarot-curtain__valance-scallop--c" />
              <View className="tarot-curtain__tassel tarot-curtain__tassel--a" />
              <View className="tarot-curtain__tassel tarot-curtain__tassel--b" />
            </View>
            <Text className="tarot-curtain__star tarot-curtain__star--a">✦</Text>
            <Text className="tarot-curtain__star tarot-curtain__star--b">✦</Text>
            <Text className="tarot-curtain__star tarot-curtain__star--c">✦</Text>
          </View>
          {/* classic 星夜仪式：流星划过 → 星环展开 → 五星逐颗亮起连线成星座 */}
          {skin === 'classic' && (
            <>
              <View className="tarot-curtain__meteor" />
              <View className="tarot-curtain__meteor tarot-curtain__meteor--b" />
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
          {/* 合拢后帘内加载进度：宝珠轨道+进度胶囊，完成后随帘幕淡出 */}
          {curtain !== 'opening' && (
            <View className="tarot-curtain__loading">
              <View className="tarot-curtain__loading-orb">
                <View className="tarot-curtain__loading-ring" />
                <Text className="tarot-curtain__loading-pct">{Math.round(curtainProgress * 100)}</Text>
              </View>
              <View className="tarot-curtain__loading-track">
                <View className="tarot-curtain__loading-fill" style={{ width: `${Math.round(curtainProgress * 100)}%` }} />
              </View>
              <Text className="tarot-curtain__loading-text">
                {curtainLoaded ? '仪式准备就绪' : skin === 'classic' ? '星图绘制中' : '测测子布置牌桌中'}
              </Text>
            </View>
          )}
        </View>
      )}
    </>
  )
}
