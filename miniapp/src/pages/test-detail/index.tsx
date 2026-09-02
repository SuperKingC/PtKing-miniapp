import { useMemo } from 'react'
import { Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { getTestDefinition } from '../../services/testRegistry'
import './index.scss'

// 测试详情页（对应「做梦心理」详情版式）：信息胶囊 + 介绍两段 + 注意卡 + 底部开始按钮
export default function TestDetailPage() {
  const router = useRouter()
  const definition = useMemo(() => getTestDefinition(router.params.testId ?? ''), [router.params.testId])

  if (!definition) {
    return (
      <View className="test-detail">
        <Text className="test-detail__missing">测试不存在或已下架</Text>
      </View>
    )
  }

  const capsules = [
    { label: '测试题量', value: `${definition.questions.length} 题` },
    { label: '完成时间', value: `约 ${definition.meta.minutes} 分钟` },
    { label: '结果展示', value: definition.meta.resultLabel },
  ]

  return (
    <View className="test-detail">
      <View className="test-detail__card">
        <Text className="test-detail__title">{definition.title}</Text>
        <View className="test-detail__capsules">
          {capsules.map((capsule) => (
            <View key={capsule.label} className="test-detail__capsule">
              <Text className="test-detail__capsule-label">{capsule.label}</Text>
              <Text className="test-detail__capsule-value">{capsule.value}</Text>
            </View>
          ))}
        </View>
        <View className="test-detail__intro">
          {definition.intro.map((paragraph) => (
            <Text key={paragraph.slice(0, 12)} className="test-detail__paragraph">{paragraph}</Text>
          ))}
        </View>
        <View className="test-detail__notice">
          <Text className="test-detail__notice-title">注意：</Text>
          <Text className="test-detail__notice-body">{definition.notice}</Text>
        </View>
      </View>
      <View
        className="test-detail__start"
        hoverClass="none"
        onClick={() => {
          wx.navigateTo({ url: `/pages/test-play/index?testId=${definition.id}` })
        }}
      >
        <Text>开始测试</Text>
      </View>
    </View>
  )
}
