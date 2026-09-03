import { useMemo, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import { useShareAppMessage } from '@tarojs/taro'
import { listTestDefinitions } from '../../services/testRegistry'
import { filterByCategory, TEST_CATEGORIES, type TestCategoryKey } from '../../services/testCategories'
import heroImg from '../../assets/illus/hero-test-center.png'
import spotPersonalityImg from '../../assets/illus/spot-personality.png'
import spotLoveImg from '../../assets/illus/spot-love.png'
import spotCareerImg from '../../assets/illus/spot-career.png'
import spotFunImg from '../../assets/illus/spot-fun.png'
import './index.scss'

// 测试中心首页：分类 chips 筛选 + 注册表数据驱动卡片网格。
// 卡片主题色按分类映射；COS 下发新测试后这里自动渲染，无需改页面
const CARD_THEME_BY_CATEGORY: Record<string, string> = {
  人格: 'violet',
  情感: 'rose',
  职场: 'blue',
  趣味: 'amber',
}

// 分类配图（奶油扁平插画风，透明底）；面具/爱心构图偏满，缩小一档放右下角
const CARD_SPOT_BY_CATEGORY: Record<string, string> = {
  人格: spotPersonalityImg,
  情感: spotLoveImg,
  职场: spotCareerImg,
  趣味: spotFunImg,
}
const CARD_SPOT_SM_CATEGORIES = new Set(['人格', '情感'])

export default function TestPage() {
  const definitions = listTestDefinitions()
  const [activeCategory, setActiveCategory] = useState<TestCategoryKey>('all')
  const visible = useMemo(
    () => filterByCategory(definitions, activeCategory),
    [definitions, activeCategory],
  )

  useShareAppMessage(() => ({ title: 'PtKing · 测测你的隐藏人格' }))

  return (
    <View className="test-page">
      <View className="test-page__hero">
        <View className="test-page__hero-text">
          <Text className="test-page__hero-title">发现你的另一面</Text>
          <Text className="test-page__hero-sub">{definitions.length} 个测试 · 全部免费</Text>
        </View>
        <Image className="test-page__hero-img" src={heroImg} mode="aspectFit" />
      </View>
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
      <View className="test-page__grid">
        {visible.map((definition) => (
          <View
            key={definition.id}
            className={`test-page__card test-page__card--${CARD_THEME_BY_CATEGORY[definition.category] ?? 'violet'}`}
            hoverClass="none"
            onClick={() => {
              wx.navigateTo({ url: `/pages/test-detail/index?testId=${definition.id}` })
            }}
          >
            <Text className="test-page__card-category">{definition.category}</Text>
            <Text className="test-page__card-title">{definition.title}</Text>
            <Text className="test-page__card-meta">
              {definition.questions.length} 题 · 约 {definition.meta.minutes} 分钟
            </Text>
            <Image
              className={
                CARD_SPOT_SM_CATEGORIES.has(definition.category)
                  ? 'test-page__card-spot test-page__card-spot--sm'
                  : 'test-page__card-spot'
              }
              src={CARD_SPOT_BY_CATEGORY[definition.category] ?? spotPersonalityImg}
              mode="aspectFit"
            />
            <Text className="test-page__card-badge">可测试</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
