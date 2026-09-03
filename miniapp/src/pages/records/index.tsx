import { Image, Text, View } from '@tarojs/components'
import { getTestDefinition } from '../../services/testRegistry'
import { loadTestRecords, type TestRecord } from '../../services/testRecords'
import emptyRecordsImg from '../../assets/illus/empty-records.png'
import './index.scss'

function formatTime(iso: string): string {
  try {
    return iso.slice(0, 10).replaceAll('-', '.')
  } catch {
    return iso
  }
}

// 记录页：顶部统计摘要（总次数/测过数/最新结果）+ 全部记录列表（按时间倒序，点击回看报告）
export default function RecordsPage() {
  const records: TestRecord[] = loadTestRecords().filter((record) => getTestDefinition(record.testId))
  const testedCount = new Set(records.map((record) => record.testId)).size
  const latest = records[0]
  const latestLabel = latest
    ? getTestDefinition(latest.testId)?.reports[latest.result.reportId]?.title ?? latest.result.reportId
    : '—'

  return (
    <View className="records-page">
      {records.length === 0 ? (
        <View className="records-page__empty">
          <Image className="records-page__empty-img" src={emptyRecordsImg} mode="aspectFit" />
          <Text className="records-page__empty-text">还没有测试记录，去「测试」页看看吧。</Text>
        </View>
      ) : (
        <>
          <View className="records-page__stats">
            <View className="records-page__stat">
              <Text className="records-page__stat-value">{records.length}</Text>
              <Text className="records-page__stat-label">完成次数</Text>
            </View>
            <View className="records-page__stat">
              <Text className="records-page__stat-value">{testedCount}</Text>
              <Text className="records-page__stat-label">测过项目</Text>
            </View>
            <View className="records-page__stat">
              <Text className="records-page__stat-value">{latestLabel}</Text>
              <Text className="records-page__stat-label">最新结果</Text>
            </View>
          </View>
          <View className="records-page__list">
            {records.map((record) => {
              const definition = getTestDefinition(record.testId)!
              const report = definition.reports[record.result.reportId]
              return (
                <View
                  key={`${record.testId}-${record.finishedAt}`}
                  className="records-page__item"
                  hoverClass="none"
                  onClick={() => {
                    wx.navigateTo({ url: `/pages/test-report/index?testId=${record.testId}` })
                  }}
                >
                  <View className="records-page__item-main">
                    <Text className="records-page__item-title">{definition.title}</Text>
                    <Text className="records-page__item-result">
                      {report ? report.title : record.result.reportId}
                    </Text>
                  </View>
                  <Text className="records-page__item-time">{formatTime(record.finishedAt)}</Text>
                </View>
              )
            })}
          </View>
        </>
      )}
    </View>
  )
}
