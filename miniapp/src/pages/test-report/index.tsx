import { useMemo } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import { getTestDefinition } from '../../services/testRegistry'
import { loadTestRecords } from '../../services/testRecords'
import './index.scss'

// 报告页：结果标题 + tagline + 维度条（dimension 模式）/分数（band 模式）+ 摘要 + 三条解读 + 行动按钮。
// 报告数据取最近一次该测试的本地记录（答题页落库后 redirect 过来，必有记录）。
// M4 分享：报告页转发给好友时带结果型标题（不剧透具体答案内容）
export default function TestReportPage() {
  const router = useRouter()
  const definition = useMemo(() => getTestDefinition(router.params.testId ?? ''), [router.params.testId])

  const record = useMemo(() => {
    if (!definition) return null
    return loadTestRecords().find((item) => item.testId === definition.id) ?? null
  }, [definition])

  useShareAppMessage(() => {
    const report = definition && record ? definition.reports[record.result.reportId] : null
    return {
      title: report
        ? `我在 ${definition!.title} 里测出了「${report.title}」，你也来试试`
        : 'PtKing · 来测测你的隐藏人格',
    }
  })

  if (!definition || !record) {
    return (
      <View className="test-report">
        <Text className="test-report__missing">还没有该测试的报告，先去完成一次测试吧。</Text>
        <View
          className="test-report__action"
          hoverClass="none"
          onClick={() => {
            wx.switchTab({ url: '/pages/test/index' })
          }}
        >
          <Text>去测试中心</Text>
        </View>
      </View>
    )
  }

  const report = definition.reports[record.result.reportId]
  if (!report) {
    return (
      <View className="test-report">
        <Text className="test-report__missing">报告数据缺失，请重新测试。</Text>
      </View>
    )
  }

  const bandScore = record.result.bandScore

  return (
    <View className="test-report">
      <Text className="test-report__eyebrow">{definition.title} · 你的报告</Text>
      <Text className="test-report__type">{report.title}</Text>
      <Text className="test-report__tagline">{report.tagline}</Text>

      {record.result.dimensionScores.length > 0 && (
        <View className="test-report__dims">
          {record.result.dimensionScores.map((dim) => (
            <View key={dim.id} className="test-report__dim">
              <Text className="test-report__dim-label">{dim.label}</Text>
              <View className="test-report__dim-track">
                <View className="test-report__dim-fill" style={{ width: `${dim.percent}%` }} />
              </View>
            </View>
          ))}
        </View>
      )}

      {record.result.factorScores.length > 0 && (
        <View className="test-report__dims">
          {record.result.factorScores.map((factor) => (
            <View key={factor.id} className="test-report__dim">
              <Text className="test-report__dim-label">
                {factor.label} · {factor.percent}%
              </Text>
              <View className="test-report__dim-track">
                <View className="test-report__dim-fill" style={{ width: `${factor.percent}%` }} />
              </View>
            </View>
          ))}
        </View>
      )}

      {bandScore !== null && (
        <View className="test-report__band">
          <Text className="test-report__band-value">{bandScore} 分</Text>
        </View>
      )}

      <View className="test-report__section">
        <Text className="test-report__section-title">结果摘要</Text>
        <Text className="test-report__summary">{report.summary}</Text>
      </View>

      <View className="test-report__section">
        <Text className="test-report__section-title">类型解读</Text>
        {report.detail.map((line) => (
          <View key={line.slice(0, 10)} className="test-report__detail-item">
            <Text className="test-report__detail-dot">·</Text>
            <Text className="test-report__detail-text">{line}</Text>
          </View>
        ))}
      </View>

      <View
        className="test-report__action"
        hoverClass="none"
        onClick={() => {
          wx.redirectTo({ url: `/pages/test-play/index?testId=${definition.id}` })
        }}
      >
        <Text>再测一次</Text>
      </View>
      <View
        className="test-report__back"
        hoverClass="none"
        onClick={() => {
          wx.switchTab({ url: '/pages/test/index' })
        }}
      >
        <Text>回到测试中心</Text>
      </View>
    </View>
  )
}
