import { useEffect, useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useAppTheme } from '../../hooks/useAppTheme'
import { APP_ENTERTAINMENT_DISCLAIMER } from '../../services/brand'
import { trackEvent } from '../../services/monitor'
import { getTestDraft } from '../../services/testDrafts'
import { getTestDefinition } from '../../services/testRegistry'
import { formatTestedCount } from '../../services/testDiscovery'
import { backButtonStyle, topInsetStyle } from '../../services/navMetrics'
import './index.scss'

// 测试详情页：信息胶囊 + 介绍 + 注意（答题指引）+ 娱乐化免责 + 开始/继续/重开
export default function TestDetailPage() {
  const router = useRouter()
  const theme = useAppTheme()
  const definition = useMemo(() => getTestDefinition(router.params.testId ?? ''), [router.params.testId])
  const [hasDraft, setHasDraft] = useState(() => Boolean(definition && getTestDraft(definition)))

  useEffect(() => {
    if (definition) trackEvent('test_detail_view', { testId: definition.id })
  }, [definition])

  useDidShow(() => {
    if (!definition) return
    setHasDraft(Boolean(getTestDraft(definition)))
  })

  if (!definition) {
    return (
      <View className={`test-detail theme-${theme}`} style={topInsetStyle()}>
        <Text className="test-detail__missing">测试不存在或已下架</Text>
      </View>
    )
  }

  const capsules = [
    { label: '测试题量', value: `${definition.questions.length} 题` },
    { label: '完成时间', value: `约 ${definition.meta.minutes} 分钟` },
    { label: '结果展示', value: definition.meta.resultLabel },
  ]

  // 有草稿则续答（草稿失效由 play 页兜底）；重开入口不在此页，交给答题页的离开确认。
  const startPlay = () => {
    trackEvent('test_start_click', { testId: definition.id })
    wx.navigateTo({ url: `/pages/test-play/index?testId=${definition.id}` })
  }

  const goBack = () => {
    // 无系统标题栏：左上返回键兜底，栈底时回测试中心
    if (Taro.getCurrentPages().length > 1) Taro.navigateBack({ delta: 1 })
    else Taro.switchTab({ url: '/pages/test/index' })
  }

  return (
    <View className={`test-detail theme-${theme}`} style={{ ...topInsetStyle(), ...backButtonStyle() }}>
      <View className="test-detail__back" onClick={goBack}>
        <Text>←</Text>
      </View>
      {/* 介绍卡与下方按钮作为一组，在 [返回钮底边, 屏幕底部] 区域内整体垂直居中 */}
      <View className="test-detail__body">
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
          {/* 人气条：resultLabel 最长 12 字符，四枚胶囊并排必挤压，改为胶囊下全宽细条（编辑配置数字，无则不渲染） */}
          {definition.testedCount ? (
            <View className="test-detail__popularity">
              <Text>🔥 已有 {formatTestedCount(definition.testedCount)} 人测过</Text>
            </View>
          ) : null}
          <View className="test-detail__intro">
            {definition.intro.slice(0, 2).map((paragraph) => (
              <Text key={paragraph.slice(0, 12)} className="test-detail__paragraph">{paragraph}</Text>
            ))}
          </View>
          <View className="test-detail__notice">
            <Text className="test-detail__notice-title">注意：</Text>
            <Text className="test-detail__notice-body">没有标准答案，按最近的通常状态和第一反应选择即可。</Text>
          </View>
        </View>
        <Text className="test-detail__disclaimer">{APP_ENTERTAINMENT_DISCLAIMER}</Text>
        <View
          className="test-detail__start"
          onClick={startPlay}
        >
          <Text>{hasDraft ? '继续测试' : '开始测试'}</Text>
        </View>
      </View>
    </View>
  )
}
