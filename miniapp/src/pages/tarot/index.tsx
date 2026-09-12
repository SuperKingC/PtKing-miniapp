import { useCallback, useEffect, useRef, useState } from 'react'
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import { APP_TAROT_SHARE_TITLE } from '../../services/brand'
import { MiniappTarotFlow } from '../../features/tarot/MiniappTarotFlow'
import { TAROT_HISTORY_OPEN_EVENT } from '../../features/tarot/tarotHistory'
import type { MiniappTarotSpread } from '../../features/tarot/tarotSpreads'
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
import skinThumbClassic from '../../assets/illus/tarot-skin-classic-v1.jpg'
import skinThumbClay from '../../assets/illus/tarot-skin-clay-v1.jpg'
import './index.scss'

// 帘幕编排：合拢(布帘拉上，期间帘后已挂载流程并预加载) → hold 等资源就绪 →
// 拉开帘子(两片向两侧滑动)露出流程。时长 = 各帘身动画时长，须与 index.scss 同步：
// CURTAIN_CLOSE_MS 对 tarot-curtain-close-*，CURTAIN_OPEN_MS 对 tarot-curtain-open-*
//（open 含右帘 0.05s 延迟，故 830 = 780 + 50）。
const CURTAIN_CLOSE_MS = 720
const CURTAIN_HOLD_MIN_MS = 160
const CURTAIN_OPEN_MS = 830

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
  // 帘幕层显示的加载进度：流程组件预加载回调外抛，合拢/星显阶段读同一份值。
  // 必须先于下方引用它的 effect 声明（否则依赖数组在 TDZ 里读到 undefined，
  // effect 不会因 curtainLoaded 变化重跑，只能干等 12s 兜底——线上「100% 后卡很久」的根因）。
  const [curtainProgress, setCurtainProgress] = useState(0)
  const [curtainLoaded, setCurtainLoaded] = useState(false)
  const handleLoadProgress = useCallback((progress: number) => {
    setCurtainProgress(progress)
    if (progress >= 1) setCurtainLoaded(true)
  }, [])
  const handleLoadDone = useCallback(() => setCurtainLoaded(true), [])
  const reducedMotion = motionPreference === 'reduced'

  const clearCurtainTimers = () => {
    curtainTimersRef.current.forEach((timer) => clearTimeout(timer))
    curtainTimersRef.current = []
  }
  useEffect(() => () => clearCurtainTimers(), [])

  // hold 阶段等加载：帘子完全盖严(合拢动画走完)且资源就绪才放行；
  // 合拢本身就兜住了最短仪式感，这里只给一点点呼吸时间，不额外拖慢
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
    // 帘幕拉合(布帘从中缝向两侧收拢到位)→ 帘后挂载流程并开始预加载 →
    // hold:帘子盖严且资源就绪后淡出；慢网 12s 兜底放行，loading 层继续显示进度
    setCurtain('closing')
    curtainTimersRef.current.push(
      setTimeout(() => {
        // 合拢动画已走完 → 此刻才挂载流程，帘后不再有内容抢先露出
        holdStartRef.current = Date.now()
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

  // 牌桌缩略图：两套皮肤各自本地裁剪的横版小图（由真背景裁出，随包下发，不走网络）。
  // 旧版铺远程 2:3 竖幅背景，资产根未配置时整块空白/退同一张 hero，用户判为「图片不对」。
  const skinThumbSrc = (option: TarotSkin): string =>
    option === 'classic' ? skinThumbClassic : skinThumbClay

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
            {/* 星点只属于 clay 奶油布帘；classic 星夜不再点缀星星 */}
            {skin === 'clay' && (
              <>
                <Text className="tarot-curtain__star tarot-curtain__star--a">✦</Text>
                <Text className="tarot-curtain__star tarot-curtain__star--b">✦</Text>
                <Text className="tarot-curtain__star tarot-curtain__star--c">✦</Text>
              </>
            )}
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
            {skin === 'clay' && (
              <>
                <Text className="tarot-curtain__star tarot-curtain__star--a">✦</Text>
                <Text className="tarot-curtain__star tarot-curtain__star--b">✦</Text>
                <Text className="tarot-curtain__star tarot-curtain__star--c">✦</Text>
              </>
            )}
          </View>
          {/* classic 星夜：只留中缝暖光，不加呼吸光环 */}
          <View className="tarot-curtain__glow" />
          {/* 打开帘子时才展示的进度：合拢到位后显示，开帘前随帘身拉开撤下 */}
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
