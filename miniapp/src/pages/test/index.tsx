import { useEffect, useMemo, useState } from 'react'
import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { listTestDefinitions, subscribeTestRegistry } from '../../services/testRegistry'
import { filterByCategory, TEST_CATEGORIES, type TestCategoryKey } from '../../services/testCategories'
import { matchTests, pickRecommendedTests } from '../../services/testDiscovery'
import { listActiveTestDrafts } from '../../services/testDrafts'
import { loadTestRecords } from '../../services/testRecords'
import { APP_SHARE_TITLE } from '../../services/brand'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { useAppTheme } from '../../hooks/useAppTheme'
import heroImg from '../../assets/illus/hero-test-center.png'
import spotPersonalityImg from '../../assets/illus/spot-personality.png'
import spotLoveImg from '../../assets/illus/spot-love.png'
import spotCareerImg from '../../assets/illus/spot-career.png'
import spotFunImg from '../../assets/illus/spot-fun.png'
import './index.scss'

// 测试中心：继续未完成 + 推荐 + 分类浏览。卡片主题色按分类映射。
const CARD_THEME_BY_CATEGORY: Record<string, string> = {
  人格: 'violet',
  情感: 'rose',
  职场: 'blue',
  趣味: 'amber',
}

const CARD_SPOT_BY_CATEGORY: Record<string, string> = {
  人格: spotPersonalityImg,
  情感: spotLoveImg,
  职场: spotCareerImg,
  趣味: spotFunImg,
}

const RECOMMEND_COUNT = 4

export default function TestPage() {
  useTabBarSelected(0)
  const theme = useAppTheme()
  const [definitions, setDefinitions] = useState(listTestDefinitions)
  const [activeCategory, setActiveCategory] = useState<TestCategoryKey>('all')
  const [resume, setResume] = useState(() => listActiveTestDrafts(listTestDefinitions())[0] ?? null)
  const [query, setQuery] = useState('')
  const [recentIds, setRecentIds] = useState(() => loadTestRecords().map((record) => record.testId))
  const keyword = query.trim()
  const visible = useMemo(
    () => filterByCategory(definitions, activeCategory),
    [definitions, activeCategory],
  )
  const recommended = useMemo(
    () => pickRecommendedTests(definitions, recentIds, resume?.definition.id, RECOMMEND_COUNT),
    [definitions, recentIds, resume],
  )
  const browsing = useMemo(() => {
    if (activeCategory !== 'all') return visible
    const hidden = new Set(recommended.map((item) => item.id))
    if (resume) hidden.add(resume.definition.id)
    return visible.filter((item) => !hidden.has(item.id))
  }, [activeCategory, visible, recommended, resume])
  const searched = useMemo(() => {
    if (!keyword) return null
    return matchTests(visible, keyword)
  }, [keyword, visible])

  const refresh = () => {
    const next = listTestDefinitions()
    setDefinitions(next)
    setResume(listActiveTestDrafts(next)[0] ?? null)
    setRecentIds(loadTestRecords().map((record) => record.testId))
  }

  useEffect(() => {
    const unsubscribe = subscribeTestRegistry(refresh)
    refresh()
    return unsubscribe
  }, [])

  useDidShow(() => {
    refresh()
  })

  useShareAppMessage(() => ({ title: APP_SHARE_TITLE }))

  const openDetail = (testId: string) => {
    wx.navigateTo({ url: `/pages/test-detail/index?testId=${testId}` })
  }

  const renderCard = (definition: typeof definitions[number], badge: string) => (
    <View
      key={definition.id}
      className={`test-page__card test-page__card--${CARD_THEME_BY_CATEGORY[definition.category] ?? 'violet'}`}
      hoverClass="none"
      onClick={() => openDetail(definition.id)}
    >
      <Text className="test-page__card-category">{definition.category}</Text>
      <Text className="test-page__card-title">{definition.title}</Text>
      <Text className="test-page__card-meta">
        {definition.questions.length} 题 · 约 {definition.meta.minutes} 分钟
      </Text>
      <Image
        className="test-page__card-spot"
        src={CARD_SPOT_BY_CATEGORY[definition.category] ?? spotPersonalityImg}
        mode="aspectFit"
        lazyLoad
      />
      <Text className="test-page__card-badge">{badge}</Text>
    </View>
  )

  return (
    <ScrollView
      className={`test-page theme-${theme}`}
      scrollY
      enhanced
      showScrollbar={false}
    >
      <View className="test-page__hero">
        <View className="test-page__hero-text">
          <Text className="test-page__hero-title">发现你的另一面</Text>
          <Text className="test-page__hero-sub">{definitions.length} 个测试 · 持续上新</Text>
        </View>
        <Image className="test-page__hero-img" src={heroImg} mode="aspectFit" lazyLoad />
      </View>

      <View className="test-page__search">
        <Input
          className="test-page__search-input"
          value={query}
          placeholder="搜索名称、分类或简介"
          confirmType="search"
          onInput={(event) => setQuery(event.detail.value)}
        />
        {keyword ? (
          <Text className="test-page__search-clear" onClick={() => setQuery('')}>清空</Text>
        ) : null}
      </View>

      {resume && (
        <View
          className="test-page__resume"
          hoverClass="none"
          onClick={() => {
            wx.navigateTo({ url: `/pages/test-play/index?testId=${resume.definition.id}` })
          }}
        >
          <Text className="test-page__section-kicker">继续答题</Text>
          <Text className="test-page__resume-title">{resume.definition.title}</Text>
          <Text className="test-page__resume-meta">
            已答到第 {resume.draft.questionIndex + 1}/{resume.definition.questions.length} 题
          </Text>
        </View>
      )}

      {!searched && activeCategory === 'all' && recommended.length > 0 && (
        <View className="test-page__section">
          <Text className="test-page__section-title">为你推荐</Text>
          <View className="test-page__grid">
            {recommended.map((definition) => renderCard(definition, '推荐'))}
          </View>
        </View>
      )}

      <View className="test-page__chips">
        {TEST_CATEGORIES.map((category) => (
          <View
            key={category.key}
            className={
              activeCategory === category.key
                ? 'test-page__chip test-page__chip--active'
                : 'test-page__chip'
            }
            hoverClass="none"
            onClick={() => setActiveCategory(category.key)}
          >
            <Text>{category.label}</Text>
          </View>
        ))}
      </View>
      <Text className="test-page__section-title">
        {searched
          ? `搜索结果 · ${searched.length}`
          : activeCategory === 'all'
            ? '全部分类'
            : TEST_CATEGORIES.find((item) => item.key === activeCategory)?.label}
      </Text>
      <View className="test-page__grid">
        {(searched ?? browsing).map((definition) => renderCard(definition, searched ? '搜索' : '可测试'))}
      </View>
      {searched && searched.length === 0 && (
        <Text className="test-page__search-empty">没有找到相关测试，换个词试试</Text>
      )}
    </ScrollView>
  )
}
