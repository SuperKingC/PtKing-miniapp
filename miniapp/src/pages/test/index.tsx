import { useEffect, useMemo, useRef, useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { listTestDefinitions, subscribeTestRegistry } from '../../services/testRegistry'
import type { TestDefinition } from '../../domain/testEngine'
import { filterByCategory, TEST_CATEGORIES, type TestCategoryKey } from '../../services/testCategories'
import { formatTestedCount, isNewTest, pickHotTests, pickRecommendedTests } from '../../services/testDiscovery'
import { listActiveTestDrafts } from '../../services/testDrafts'
import { loadTestRecords } from '../../services/testRecords'
import { APP_SHARE_TITLE } from '../../services/brand'
import { trackEvent } from '../../services/monitor'
import { pickDailyCategory, pickDailyTest } from '../../domain/experience'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { useAppTheme } from '../../hooks/useAppTheme'
import { topInsetStyle } from '../../services/navMetrics'
import heroCardImg from '../../assets/illus/hero-card-v14.png'
import tileMbtiImg from '../../assets/illus/tile-mbti-v10.png'
import tileStarImg from '../../assets/illus/tile-star-v10.png'
import tileLoveImg from '../../assets/illus/tile-love-v10.png'
import tileCareerImg from '../../assets/illus/tile-career-v35.png'
import tileFunImg from '../../assets/illus/tile-fun-v39.png'
import './index.scss'

const CARD_SPOT_BY_CATEGORY: Record<string, string> = { 人格: tileStarImg, 情感: tileLoveImg, 职场: tileCareerImg, 趣味: tileFunImg }

/** 定义列表的内容指纹：id+标题一致即视为同一批，用于 onShow 幂等短路 */
function idsOf(definitions: TestDefinition[]): string {
  return definitions.map((definition) => `${definition.id}:${definition.title}`).join(',')
}

function todayCategory() {
  const now = new Date()
  return pickDailyCategory(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

function cardSpot(definition: typeof listTestDefinitions[number]): string {
  if (definition.id === 'mbti') return tileMbtiImg
  return CARD_SPOT_BY_CATEGORY[definition.category] ?? tileStarImg
}

export default function TestPage() {
  useTabBarSelected(0)
  const theme = useAppTheme()
  const [definitions, setDefinitions] = useState(listTestDefinitions)
  const [activeCategory, setActiveCategory] = useState<TestCategoryKey>('all')
  /* 分类切换闪屏（实机录屏逐帧复现+automator offset 采样量化）：页面带非零滚动位
     （含 reLaunch 恢复的残留 ~55px）切分类，推荐区卸载内容高度骤减，WebView 对
     越界滚动位逐帧钳制回弹，整页内容连帧窜动。方案：切换当拍把视口归零——
     onScroll 持续记录实时位，仅滚动位非零时才挂受控 scrollTop 归零（scroll-top
     变化自带 ~240ms 平滑滚动，滚动位大时归顶顺理成章；滚动位≈0 时完全不挂、
     零动画零滚动）。onScrollStop 后摘除恢复非受控，避免后续 render 拉回旧值。
     scroll-into-view 在 enhanced 下强制动画已否决；scrollAnchoring=false 双保险 */
  const [scrollTop, setScrollTop] = useState<number | undefined>(undefined)
  const scrollPosRef = useRef(0)
  const pickCategory = (key: TestCategoryKey) => {
    if (key === activeCategory) return
    if (scrollPosRef.current > 1) {
      setScrollTop((prev) => (prev === undefined ? 0 : prev === 0 ? 0.01 : 0))
    }
    setActiveCategory(key)
  }
  const handleScroll = (e: { detail?: { scrollTop?: number } }) => {
    scrollPosRef.current = e.detail?.scrollTop ?? 0
  }
  const handleScrollStop = () => {
    if (scrollTop !== undefined) setScrollTop(undefined)
  }
  const [resume, setResume] = useState(() => listActiveTestDrafts(listTestDefinitions())[0] ?? null)
  const [recentIds, setRecentIds] = useState(() => loadTestRecords().map((record) => record.testId))
  const [dailyCategory, setDailyCategory] = useState(todayCategory)
  const daily = useMemo(() => {
    const now = new Date()
    return pickDailyTest(definitions, now.getFullYear(), now.getMonth() + 1, now.getDate())
  }, [definitions, dailyCategory])
  const visible = useMemo(() => filterByCategory(definitions, activeCategory), [definitions, activeCategory])
  const recommended = useMemo(() => pickRecommendedTests(definitions, recentIds, resume?.definition.id, 4), [definitions, recentIds, resume])
  /* 热门榜：有人工编辑 hotRank 的测试（无编辑数据时为空，页面回退「为你推荐」） */
  const hot = useMemo(() => pickHotTests(definitions, 4), [definitions])
  const browsing = useMemo(() => {
    if (activeCategory !== 'all') return visible
    const featured = hot.length > 0 ? hot : recommended
    const hidden = new Set(featured.map((item) => item.id))
    if (resume) hidden.add(resume.definition.id)
    return visible.filter((item) => !hidden.has(item.id))
  }, [activeCategory, visible, hot, recommended, resume])

  const refresh = () => {
    const next = listTestDefinitions()
    const nextResume = listActiveTestDrafts(next)[0] ?? null
    const nextRecentIds = loadTestRecords().map((record) => record.testId)
    const nextDailyCategory = todayCategory()
    // 每次 onShow 都整批换新引用会让整页再渲染一遍（用户读作「刷新列表/闪一下」）：
    // 数据未变时全部跳过 setState，首点 tab 不再有第二趟 render。
    setDefinitions((prev) => (idsOf(prev) === idsOf(next) ? prev : next))
    setResume((prev) => (prev?.definition.id === nextResume?.definition.id && prev?.draft.answers.length === nextResume?.draft.answers.length ? prev : nextResume))
    setRecentIds((prev) => (prev.join(',') === nextRecentIds.join(',') ? prev : nextRecentIds))
    setDailyCategory((prev) => (prev === nextDailyCategory ? prev : nextDailyCategory))
  }
  useEffect(() => {
    const unsubscribe = subscribeTestRegistry(refresh)
    refresh()
    return unsubscribe
  }, [])
  useDidShow(refresh)
  useShareAppMessage(() => ({ title: APP_SHARE_TITLE }))

  const openDetail = (testId: string) => {
    trackEvent('test_card_open', { testId })
    wx.navigateTo({ url: `/pages/test-detail/index?testId=${encodeURIComponent(testId)}` })
  }
  /** 卡片人气文案：「X万+人测过」，无编辑数据时为空串 */
  const testedText = (definition: typeof definitions[number]) =>
    definition.testedCount ? `${formatTestedCount(definition.testedCount)}人测过` : ''
  /** 主列表 badge 槽位优先级：NEW（14 天内上新）> 人气 > 「可测试」 */
  const regularBadge = (definition: typeof definitions[number]) =>
    isNewTest(definition, new Date()) ? 'NEW' : testedText(definition) || '可测试'
  const renderCard = (definition: typeof definitions[number], options?: { badge?: string; hotRank?: number }) => {
    const { hotRank, badge = regularBadge(definition) } = options ?? {}
    return (
    <View key={definition.id} className="test-page__card" onClick={() => openDetail(definition.id)}>
      {/* 不挂 lazyLoad:分类切换大增删卡片时 lazy 图重触发解码,卡面先出文字后出图标,
          整列闪一下(实机录帧 f030→f031);22 张 tile 共 ~200KB,常驻解码缓存更稳 */}
      <Image className="test-page__card-spot" src={cardSpot(definition)} mode="aspectFit" />
      <View className="test-page__card-content">
        <Text className="test-page__card-title">{definition.title}</Text>
        <Text className="test-page__card-sub">{definition.intro[0]}</Text>
        <View className="test-page__card-meta">
          <Text className="test-page__card-clock" aria-hidden />
          {hotRank ? (
            /* 热门榜卡：省略时长题数，聚焦排名+人气两个钩子 */
            <Text>TOP{hotRank}{testedText(definition) ? ` · ${testedText(definition)}` : ''}</Text>
          ) : (
            <Text>约 {definition.meta.minutes} 分钟 · {definition.questions.length} 题 · {badge}</Text>
          )}
        </View>
      </View>
      <Text className="test-page__card-go">开始测试</Text>
    </View>
    )
  }
  /* 单 grid 渲染推荐+主列表：分类切换时卡片 key 在同一父列表内 move（React 复用不重挂），
     替代旧的「推荐区整块卸载+browsing 重建」——那是全部↔cat 专有的闪屏源
     （29卡↔7卡大增删+跨区搬家重挂，WebView 合成层重建出整页白帧，实机 44fps 录屏 f046/f053） */
  const isAll = activeCategory === 'all'
  const gridChildren: (JSX.Element)[] = []
  if (isAll && hot.length > 0) {
    gridChildren.push(<Text key="sec-hot" className="test-page__section-title">🔥 热门榜</Text>)
    hot.forEach((definition, index) => gridChildren.push(renderCard(definition, { hotRank: index + 1 })))
  } else if (isAll && recommended.length > 0) {
    gridChildren.push(<Text key="sec-recommended" className="test-page__section-title">为你推荐</Text>)
    for (const definition of recommended) gridChildren.push(renderCard(definition, { badge: '推荐' }))
  }
  gridChildren.push(<Text key="sec-main" className="test-page__section-title">{isAll ? '更多测试' : TEST_CATEGORIES.find((item) => item.key === activeCategory)?.label}</Text>)
  for (const definition of browsing) gridChildren.push(renderCard(definition))

  return (
    <View className={`tab-page test-page-shell theme-${theme}`} style={topInsetStyle()}>
      <ScrollView className="tab-page__scroll" scrollY scrollTop={scrollTop} scrollAnchoring={false} enhanced showScrollbar={false} onScroll={handleScroll} onScrollStop={handleScrollStop}>
        <View className="test-page">
          <View className="test-page__brand">
            <View className="test-page__brand-text">
              <Text className="test-page__brand-title">测测子</Text>
              <Text className="test-page__brand-sub">来测测你的另一面</Text>
            </View>
          </View>
          {daily && <View className="test-page__hero" onClick={() => {
            trackEvent('today_entry_open', { category: dailyCategory, testId: daily.id })
            openDetail(daily.id)
          }}>
            {/* 参考图整卡：标题/副标题/猫/云全部烘焙在图里，等宽铺满 */}
            <Image className="test-page__hero-img" src={heroCardImg} mode="widthFix" lazyLoad />
          </View>}
          {resume && <View className="test-page__resume" onClick={() => wx.navigateTo({ url: `/pages/test-play/index?testId=${encodeURIComponent(resume.definition.id)}` })}>
            <Text className="test-page__section-kicker">继续答题</Text>
            <Text className="test-page__resume-title">{resume.definition.title}</Text>
            <Text className="test-page__resume-meta">已完成 {resume.draft.answers.length}/{resume.definition.questions.length} 题</Text>
          </View>}
          <View id="test-category-results" className="test-page__chips">
            {TEST_CATEGORIES.map((category) => <View key={category.key} className={activeCategory === category.key ? 'test-page__chip test-page__chip--active' : 'test-page__chip'} onClick={() => pickCategory(category.key)}><Text>{category.label}</Text></View>)}
          </View>
          {/* 推荐+主列表合进同一个 grid:卡片跨分组移动走 React move 复用,不重挂不重解码 */}
          <View className="test-page__grid">{gridChildren}</View>
        </View>
      </ScrollView>
    </View>
  )
}
