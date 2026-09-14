import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Button, Image, Text, View } from '@tarojs/components'
import { MiniappTarotQuestionStage } from './MiniappTarotQuestionStage'
import { MiniappTarotSpreadStage } from './MiniappTarotSpreadStage'
import { MiniappTarotShuffleStage } from './MiniappTarotShuffleStage'
import { MiniappTarotCutStage } from './MiniappTarotCutStage'
import { MiniappTarotFanStage } from './MiniappTarotFanStage'
import { MiniappTarotRevealStage } from './MiniappTarotRevealStage'
import { MiniappTarotReadingStage } from './MiniappTarotReadingStage'
import { useMotionPreference } from '../../hooks/useMotionPreference'
import { MiniappTarotHistoryPanel } from './MiniappTarotHistoryPanel'
import { areTarotAssetsCached, getTarotSanctuaryBackground, preloadTarotResources, resolveTarotAssetUrl } from './tarotAssets'
import { getTarotSkin } from './tarotSkin'
import { createTarotCandidates } from './tarotCards'
import { createInitialTarotFlow, tarotFlowReducer } from './tarotFlow'
import { listTarotHistory, saveTarotReading } from './tarotHistory'
import { buildTarotReading, buildTarotShareTitle } from './tarotReading'
import { impactFeedback, longFeedback, tapFeedback } from '../../services/haptics'
import { getTopInsetPx, topInsetStyle } from '../../services/navMetrics'
import { getTarotStageFit, readTarotWindowBox } from './tarotStageFit'
import { findTarotSpread, type MiniappTarotSpread } from './tarotSpreads'
import './MiniappTarotFlow.scss'

interface MiniappTarotFlowProps {
  onClose(): void
  onShareTitleChange?(title: string): void
  initialSpread?: MiniappTarotSpread
  /** 入口是否已在页面上选定牌阵：false 时跳过流程内选牌阵阶段 */
  chooseSpread?: boolean
  historyRequest?: number
  /** 资源预加载进度(0..1)外抛：帘幕开场动画在合拢/星显阶段展示同一份进度 */
  onLoadProgress?(progress: number): void
  /** 预加载全部成功后回调：帘幕层据此淡入正式界面 */
  onLoadDone?(): void
  /**
   * 预加载是否在真正走网络（有的资源没命中缓存）。false 表示本次纯本地命中，
   * 帘幕层可跳过进度/提示 UI，直接走开帘动画。
   */
  onLoadNetworkNeeded?(needed: boolean): void
}

const stageOrder = ['question', 'spread', 'shuffle', 'cut', 'fan', 'reveal', 'reading'] as const

export function MiniappTarotFlow({ onClose, onShareTitleChange, initialSpread = 'single', chooseSpread = true, historyRequest = 0, onLoadProgress, onLoadDone, onLoadNetworkNeeded }: MiniappTarotFlowProps) {
  const [state, dispatch] = useReducer(tarotFlowReducer, initialSpread, (spread) => ({ ...createInitialTarotFlow(), spread }))
  const motionPreference = useMotionPreference()
  // 皮肤在挂载时定死，流程内不支持中途换肤；换肤入口在塔罗首页
  const [skin] = useState(() => getTarotSkin())
  const [historyOpen, setHistoryOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [resourcesLoaded, setResourcesLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const leaveTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const loadAttemptRef = useRef(0)
  const history = useMemo(() => historyOpen ? listTarotHistory() : [], [historyOpen, state.stage])
  // 进度条只画实际会经过的阶段：已选定牌阵时没有选牌阵一幕
  const stages = useMemo(
    () => (chooseSpread ? stageOrder : stageOrder.filter((stage) => stage !== 'spread')),
    [chooseSpread],
  )
  const activeStageIndex = stages.indexOf(state.stage)
  // clay 的四仪式阶段：标题那行让位给「测测子气泡」（气泡要有位置浮到猫头上方，
  // 不能和 header 里的牌阵名/胶囊挤同一条带），故根节点挂状态类供 CSS 隐藏标题。
  const clayRitual = state.stage === 'shuffle' || state.stage === 'cut' || state.stage === 'fan' || state.stage === 'reveal'
  const [windowBox, setWindowBox] = useState(readTarotWindowBox)
  const stageFit = useMemo(() => getTarotStageFit({
    stage: state.stage,
    skin,
    cardCount: findTarotSpread(state.spread).count,
    windowWidth: windowBox.width,
    windowHeight: windowBox.height,
    safeAreaBottom: windowBox.safeAreaBottom,
    topInsetPx: getTopInsetPx(),
  }), [state.stage, state.spread, skin, windowBox])

  useEffect(() => {
    const onResize = () => setWindowBox(readTarotWindowBox())
    Taro.onWindowResize?.(onResize)
    return () => {
      Taro.offWindowResize?.(onResize)
    }
  }, [])

  const loadResources = () => {
    const attempt = ++loadAttemptRef.current
    setResourcesLoaded(false)
    setLoadProgress(0)
    setLoadError(false)
    // 同步判定本次是否要走网络：全命中缓存时帘幕层不显示进度/提示 UI
    onLoadNetworkNeeded?.(!areTarotAssetsCached(skin))
    preloadTarotResources((p) => {
      if (attempt !== loadAttemptRef.current) return
      setLoadProgress(p)
      onLoadProgress?.(p)
    }, skin)
      .then(({ failedUrls }) => {
        if (attempt !== loadAttemptRef.current) return
        if (failedUrls.length === 0) {
          setResourcesLoaded(true)
          onLoadDone?.()
        }
        else setLoadError(true)
      })
      .catch(() => {
        if (attempt === loadAttemptRef.current) setLoadError(true)
      })
  }

  useEffect(() => {
    loadResources()
    return () => { loadAttemptRef.current++ }
  }, [])

  useEffect(() => () => {
    leaveTimersRef.current.forEach((timer) => clearTimeout(timer))
    leaveTimersRef.current = []
  }, [])

  // 跨页请求由常驻页面接收，流程按需挂载后仍能打开历史。
  useEffect(() => {
    if (historyRequest > 0) setHistoryOpen(true)
  }, [historyRequest])

  // while the reading is on screen, register a tarot-flavored share title so
  // the page-level useShareAppMessage can invite friends with the result card
  const reading = state.stage === 'reading' ? state.reading : null
  useEffect(() => {
    if (!reading) return
    onShareTitleChange?.(buildTarotShareTitle(reading))
    return () => onShareTitleChange?.('')
  }, [reading, onShareTitleChange])

  const createCandidates = () => createTarotCandidates(10)

  const selectSpread = (spread: MiniappTarotSpread) => {
    if (leaving || state.stage !== 'spread') return
    impactFeedback('medium')
    dispatch({ type: 'set-spread', spread })
    leaveTimersRef.current.push(
      setTimeout(() => setLeaving(true), 220),
      setTimeout(() => {
        dispatch({ type: 'continue' })
        setLeaving(false)
      }, 660),
    )
  }

  const finishReading = () => {
    if (state.stage !== 'reveal' || !state.flipped.every(Boolean)) return
    longFeedback()
    const reading = buildTarotReading(state.question, state.spread, state.drawn)
    saveTarotReading(reading)
    dispatch({ type: 'finish-reading', reading })
  }

  const restart = () => {
    leaveTimersRef.current.forEach((timer) => clearTimeout(timer))
    leaveTimersRef.current = []
    setHistoryOpen(false)
    setLeaving(false)
    dispatch({ type: 'restart', spread: state.spread })
  }

  return (
    <View className={['miniapp-tarot', `motion-${motionPreference}`, `skin-${skin}`, skin === 'clay' && clayRitual ? 'miniapp-tarot--clay-ritual' : '', leaving ? 'miniapp-tarot--leaving' : ''].filter(Boolean).join(' ')} style={{
      ...topInsetStyle(),
      '--tarot-stage-scale': String(stageFit.scale),
      '--tarot-fit-height': `${stageFit.stackRpx}rpx`,
    }}>
      {/* 场景层包住背景/纱罩/火焰/星点：clay 皮肤对它整体放大+上移，四层同一几何 */}
      <View className="miniapp-tarot__scene">
        <Image
          className="miniapp-tarot__background"
          src={resolveTarotAssetUrl(getTarotSanctuaryBackground(skin))}
          mode="aspectFill"
          fadeIn={false}
        />
        <View className="miniapp-tarot__veil" />
        {/* clay 牌桌背景把蜡烛画成未点燃，火焰改由这层 CSS 叠加：坐标按背景图比例锚在烛芯上。
            挂在纱罩之后，火苗读作画面里的光源，不被纱罩压暗一层 */}
        {skin === 'clay' && (
          <View className="miniapp-tarot__flame-scene" aria-hidden>
            <View className="miniapp-tarot__flame">
              <View className="miniapp-tarot__flame-glow" />
              <View className="miniapp-tarot__flame-pool" />
              <View className="miniapp-tarot__flame-body">
                <View className="miniapp-tarot__flame-core" />
                <View className="miniapp-tarot__flame-ember" />
              </View>
            </View>
          </View>
        )}
        <View className="miniapp-tarot__stars" />
      </View>
      <View className="miniapp-tarot__fade" />

      {!resourcesLoaded ? (
        <View className="miniapp-tarot__loading">
          {loadError ? (
            <>
              <Text className="miniapp-tarot__loading_title">资源加载失败</Text>
              <Text className="miniapp-tarot__loading_hint">请检查网络和资源服务后重新加载</Text>
              <Button className="miniapp-tarot__loading_retry" onClick={loadResources}>重新加载</Button>
              <Button className="miniapp-tarot__loading_exit" aria-label="退出塔罗" onClick={onClose}>退出塔罗</Button>
            </>
          ) : (
            <>
              <View className="miniapp-tarot__loading-icon">
                <View className="miniapp-tarot__loading_ring" />
                <Text className="miniapp-tarot__loading_pct">{Math.round(loadProgress * 100)}%</Text>
              </View>
              <Text className="miniapp-tarot__loading_hint">正在下载塔罗资源…</Text>
              <Button className="miniapp-tarot__loading_exit" aria-label="退出塔罗" onClick={onClose}>退出塔罗</Button>
            </>
          )}
        </View>
      ) : (
        <>
          <View className="miniapp-tarot__header">
            <Button aria-label="退出塔罗" onClick={onClose}>×</Button>
            <View className="miniapp-tarot__header-title">
              <Text>{state.stage === 'question' ? '聆听内心的提问' : findTarotSpread(state.spread).label}</Text>
            </View>
            <Button aria-label="查看解读历史" onClick={() => { tapFeedback(); setHistoryOpen(true) }}>⌛</Button>
          </View>
          <View className="miniapp-tarot__progress" aria-hidden>
            {stages.map((stage, index) => (
              <View
                key={stage}
                className={index <= activeStageIndex ? 'miniapp-tarot__progress-active' : ''}
              />
            ))}
          </View>

          {state.stage === 'question' && (
            <MiniappTarotQuestionStage
              question={state.question}
              nextLabel={chooseSpread ? '下一步 · 选牌阵' : '下一步 · 洗牌'}
              onQuestionChange={(question) => dispatch({ type: 'set-question', question })}
              onContinue={() => { tapFeedback(); dispatch({ type: 'continue', chooseSpread }) }}
            />
          )}
          {state.stage === 'spread' && (
            <MiniappTarotSpreadStage
              spread={state.spread}
              onSelect={selectSpread}
            />
          )}
          {state.stage === 'shuffle' && (
            <MiniappTarotShuffleStage
              progress={state.progress}
              onProgress={(progress) => dispatch({ type: 'set-shuffle-progress', progress })}
              onContinue={() => { tapFeedback(); dispatch({ type: 'continue' }) }}
              onSkip={() => { tapFeedback(); dispatch({ type: 'skip-ritual', candidates: createCandidates() }) }}
            />
          )}
          {state.stage === 'cut' && (
            <MiniappTarotCutStage
              cutCount={state.cutCount}
              cutting={state.cutting}
              onStartCut={() => { impactFeedback('medium'); dispatch({ type: 'start-cut' }) }}
              onFinishCut={() => dispatch({ type: 'finish-cut' })}
              onContinue={() => { tapFeedback(); dispatch({ type: 'enter-fan', candidates: createCandidates() }) }}
              onSkip={() => { tapFeedback(); dispatch({ type: 'skip-ritual', candidates: createCandidates() }) }}
            />
          )}
          {state.stage === 'fan' && (
            <MiniappTarotFanStage
              candidates={state.candidates}
              picked={state.picked}
              flyingCard={state.flyingCard}
              needCount={findTarotSpread(state.spread).count}
              onPick={(index) => { impactFeedback('medium'); dispatch({ type: 'pick-card', index }) }}
              onFinishPick={(index) => dispatch({ type: 'finish-pick', index })}
              onContinue={() => { tapFeedback(); dispatch({ type: 'enter-reveal' }) }}
            />
          )}
          {state.stage === 'reveal' && (
            <MiniappTarotRevealStage
              drawn={state.drawn}
              flipped={state.flipped}
              onFlip={(index) => { impactFeedback('heavy'); dispatch({ type: 'flip-card', index }) }}
              onContinue={finishReading}
            />
          )}
          {state.stage === 'reading' && (
            <MiniappTarotReadingStage
              reading={state.reading}
              onRestart={restart}
              onClose={onClose}
            />
          )}

          {historyOpen && <MiniappTarotHistoryPanel history={history} onClose={() => setHistoryOpen(false)} />}
        </>
      )}
    </View>
  )
}
