import { Text, View } from '@tarojs/components'
import './index.scss'

// M0 骨架静态预览页：版式按「做梦心理」参考稿搭（快速分类宫格 + 横滑大卡），
// 数据与跳转在 M1 由测试引擎（COS JSON TestDefinition）驱动后替换
const QUICK_CATEGORIES = ['最新测试', '热门测试', '情感恋爱', '人格自我'] as const

const FEATURED_CARDS = [
  { id: 'mbti', title: 'MBTI 测试', meta: '24 题 · 约 3-5 分钟', theme: 'violet' },
  { id: 'love', title: '恋爱人格', meta: '12 题 · 约 2-3 分钟', theme: 'rose' },
  { id: 'burnout', title: '内耗指数', meta: '8 题 · 约 1-2 分钟', theme: 'amber' },
] as const

export default function TestPage() {
  return (
    <View className="test-page">
      <View className="test-page__section-title">快速测试</View>
      <View className="test-page__quick">
        {QUICK_CATEGORIES.map((label) => (
          <View key={label} className="test-page__quick-item">
            <Text>{label}</Text>
          </View>
        ))}
      </View>
      <View className="test-page__section-title">人格专区</View>
      <View className="test-page__cards">
        {FEATURED_CARDS.map((card) => (
          <View key={card.id} className={`test-page__card test-page__card--${card.theme}`}>
            <Text className="test-page__card-title">{card.title}</Text>
            <Text className="test-page__card-meta">{card.meta}</Text>
            <Text className="test-page__card-badge">即将上线</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
