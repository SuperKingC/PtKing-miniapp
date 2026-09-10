import { useEffect, useMemo, useState } from 'react'
import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { listTestDefinitions, subscribeTestRegistry } from '../../services/testRegistry'
import { filterByCategory, TEST_CATEGORIES, type TestCategoryKey } from '../../services/testCategories'
import { matchTests, pickRecommendedTests } from '../../services/testDiscovery'
import { listActiveTestDrafts } from '../../services/testDrafts'
import { loadTestRecords } from '../../services/testRecords'
import { APP_SHARE_TITLE } from '../../services/brand'
import { trackEvent } from '../../services/monitor'
import { pickDailyCategory, pickDailyTest } from '../../domain/experience'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { useAppTheme } from '../../hooks/useAppTheme'
import { topInsetStyle } from '../../services/navMetrics'
import heroCardImg from '../../assets/illus/hero-card-v2.png'
import tileMbtiImg from '../../assets/illus/tile-mbti-v3.png'
import tileStarImg from '../../assets/illus/tile-star-v1.png'
import tileLoveImg from '../../assets/illus/tile-love-v3.png'
import tileCareerImg from '../../assets/illus/tile-career-v2.png'
import tileFunImg from '../../assets/illus/tile-fun-v2.png'
import bellImg from '../../assets/illus/icon-bell-v2.png'
import './index.scss'

const CARD_SPOT_BY_CATEGORY: Record<string, string> = { 人格: tileStarImg, 情感: tileLoveImg, 职场: tileCareerImg, 趣味: tileFunImg }

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
  const [resume, setResume] = useState(() => listActiveTestDrafts(listTestDefinitions())[0] ?? null)
  const [query, setQuery] = useState('')
  const [recentIds, setRecentIds] = useState(() => loadTestRecords().map((record) => record.testId))
  const [dailyCategory, setDailyCategory] = useState(todayCategory)
  const daily = useMemo(() => {
    const now = new Date()
    return pickDailyTest(definitions, now.getFullYear(), now.getMonth() + 1, now.getDate())
  }, [definitions, dailyCategory])
  const keyword = query.trim()
  const visible = useMemo(() => filterByCategory(definitions, activeCategory), [definitions, activeCategory])
  const recommended = useMemo(() => pickRecommendedTests(definitions, recentIds, resume?.definition.id, 4), [definitions, recentIds, resume])
  const browsing = useMemo(() => {
    if (activeCategory !== 'all') return visible
    const hidden = new Set(recommended.map((item) => item.id))
    if (resume) hidden.add(resume.definition.id)
    return visible.filter((item) => !hidden.has(item.id))
  }, [activeCategory, visible, recommended, resume])
  const searched = useMemo(() => keyword ? matchTests(visible, keyword) : null, [keyword, visible])

  const refresh = () => {
    const next = listTestDefinitions()
    setDefinitions(next)
    setResume(listActiveTestDrafts(next)[0] ?? null)
    setRecentIds(loadTestRecords().map((record) => record.testId))
    setDailyCategory(todayCategory())
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
  const renderCard = (definition: typeof definitions[number], badge: string) => (
    <View key={definition.id} className="test-page__card" hoverClass="pressable--pressed" onClick={() => openDetail(definition.id)}>
      <Image className="test-page__card-spot" src={cardSpot(definition)} mode="aspectFit" lazyLoad />
      <View className="test-page__card-content">
        <Text className="test-page__card-title">{definition.title}</Text>
        <Text className="test-page__card-sub">{definition.intro[0]}</Text>
        <Text className="test-page__card-meta">约 {definition.meta.minutes} 分钟 · {definition.questions.length} 题 · {badge}</Text>
      </View>
      <Text className="test-page__card-go">开始测试</Text>
    </View>
  )

  return (
    <View className={`tab-page test-page-shell theme-${theme}`} style={topInsetStyle()}>
      <ScrollView className="tab-page__scroll" scrollY enhanced showScrollbar={false}>
        <View className="test-page">
          <View className="test-page__brand">
            <View className="test-page__brand-text">
              <Text className="test-page__brand-title">测测子</Text>
              <Text className="test-page__brand-sub">来测测你的另一面</Text>
            </View>
            <Image className="test-page__bell" src={bellImg} mode="aspectFit" />
          </View>
          {daily && <View className="test-page__hero" hoverClass="pressable--pressed" onClick={() => {
            trackEvent('today_entry_open', { category: dailyCategory, testId: daily.id })
            openDetail(daily.id)
          }}>
            {/* 参考图整卡：标题/副标题/猫/云全部烘焙在图里，等宽铺满 */}
            <Image className="test-page__hero-img" src={heroCardImg} mode="widthFix" lazyLoad />
          </View>}
          <View className="test-page__search">
            <Input className="test-page__search-input" value={query} placeholder="搜索名称、分类或简介" confirmType="search" onInput={(event) => setQuery(event.detail.value)} />
            {keyword ? <Text className="test-page__search-clear" onClick={() => setQuery('')}>清空</Text> : null}
          </View>
          {resume && <View className="test-page__resume" hoverClass="pressable--pressed" onClick={() => wx.navigateTo({ url: `/pages/test-play/index?testId=${encodeURIComponent(resume.definition.id)}` })}>
            <Text className="test-page__section-kicker">继续答题</Text>
            <Text className="test-page__resume-title">{resume.definition.title}</Text>
            <Text className="test-page__resume-meta">已完成 {resume.draft.answers.length}/{resume.definition.questions.length} 题</Text>
          </View>}
          <View id="test-category-results" className="test-page__chips">
            {TEST_CATEGORIES.map((category) => <View key={category.key} className={activeCategory === category.key ? 'test-page__chip test-page__chip--active' : 'test-page__chip'} hoverClass="pressable--pressed" onClick={() => setActiveCategory(category.key)}><Text>{category.label}</Text></View>)}
          </View>
          {!searched && activeCategory === 'all' && recommended.length > 0 && <View className="test-page__section">
            <Text className="test-page__section-title">为你推荐</Text>
            <View className="test-page__grid">{recommended.map((definition) => renderCard(definition, '推荐'))}</View>
          </View>}
          <Text className="test-page__section-title">{searched ? `搜索结果 · ${searched.length}` : activeCategory === 'all' ? '更多测试' : TEST_CATEGORIES.find((item) => item.key === activeCategory)?.label}</Text>
          <View className="test-page__grid">{(searched ?? browsing).map((definition) => renderCard(definition, searched ? '搜索' : '可测试'))}</View>
          {searched && searched.length === 0 && <Text className="test-page__search-empty">当前分类没有相关测试，试试切换「全部」或换个词。</Text>}
        </View>
      </ScrollView>
    </View>
  )
}
