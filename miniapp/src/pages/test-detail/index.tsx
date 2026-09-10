import { useEffect, useMemo, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import { useDidShow, useRouter } from '@tarojs/taro'
import { useAppTheme } from '../../hooks/useAppTheme'
import { APP_ENTERTAINMENT_DISCLAIMER } from '../../services/brand'
import { trackEvent } from '../../services/monitor'
import { clearTestDraft, getTestDraft } from '../../services/testDrafts'
import { getTestDefinition } from '../../services/testRegistry'
import spotPersonalityImg from '../../assets/illus/spot-personality-v2.png'
import spotLoveImg from '../../assets/illus/spot-love-v2.png'
import spotCareerImg from '../../assets/illus/spot-career-v2.png'
import spotFunImg from '../../assets/illus/spot-fun-v2.png'
import './index.scss'

const COVER_BY_CATEGORY: Record<string, string> = {
  人格: spotPersonalityImg,
  情感: spotLoveImg,
  职场: spotCareerImg,
  趣味: spotFunImg,
}

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
      <View className={`test-detail theme-${theme}`}>
        <Text className="test-detail__missing">测试不存在或已下架</Text>
      </View>
    )
  }

  const capsules = [
    { label: '测试题量', value: `${definition.questions.length} 题` },
    { label: '完成时间', value: `约 ${definition.meta.minutes} 分钟` },
    { label: '结果展示', value: definition.meta.resultLabel },
  ]

  const startPlay = (restart: boolean) => {
    trackEvent('test_start_click', { testId: definition.id, restart })
    if (restart) clearTestDraft(definition.id)
    wx.navigateTo({ url: `/pages/test-play/index?testId=${definition.id}` })
  }

  return (
    <View className={`test-detail theme-${theme}`}>
      <View className="test-detail__card">
        <Image className="test-detail__cover" src={COVER_BY_CATEGORY[definition.category] ?? spotPersonalityImg} mode="aspectFit" />
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
        hoverClass="pressable--pressed"
        onClick={() => startPlay(false)}
      >
        <Text>{hasDraft ? '继续测试' : '开始测试'}</Text>
      </View>
      {hasDraft && (
        <View
          className="test-detail__restart"
          hoverClass="pressable--pressed"
          onClick={() => startPlay(true)}
        >
          <Text>重新开始</Text>
        </View>
      )}
    </View>
  )
}
