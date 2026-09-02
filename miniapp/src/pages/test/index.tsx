import { Text, View } from '@tarojs/components'
import { useShareAppMessage } from '@tarojs/taro'
import { listTestDefinitions } from '../../services/testRegistry'
import './index.scss'

const QUICK_CATEGORIES = ['最新测试', '热门测试', '情感恋爱', '人格自我'] as const

// 测试中心首页：注册表数据驱动（M2 起五个静态测试 + COS 下发扩量后卡片自动增加）
export default function TestPage() {
  const definitions = listTestDefinitions()

  useShareAppMessage(() => ({ title: 'PtKing · 测测你的隐藏人格' }))

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
        {definitions.map((definition) => (
          <View
            key={definition.id}
            className="test-page__card test-page__card--violet"
            hoverClass="none"
            onClick={() => {
              wx.navigateTo({ url: `/pages/test-detail/index?testId=${definition.id}` })
            }}
          >
            <Text className="test-page__card-title">{definition.title}</Text>
            <Text className="test-page__card-meta">
              {definition.questions.length} 题 · 约 {definition.meta.minutes} 分钟
            </Text>
            <Text className="test-page__card-badge">可测试</Text>
          </View>
        ))}
        <View className="test-page__card test-page__card--locked">
          <Text className="test-page__card-meta">更多测试</Text>
          <Text className="test-page__card-title">敬请期待</Text>
        </View>
      </View>
    </View>
  )
}
