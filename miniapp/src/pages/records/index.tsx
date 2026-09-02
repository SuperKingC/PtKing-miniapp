import { Text, View } from '@tarojs/components'
import { getTestDefinition } from '../../services/testRegistry'
import { loadTestRecords, type TestRecord } from '../../services/testRecords'
import './index.scss'

function formatTime(iso: string): string {
  try {
    return iso.slice(0, 10).replaceAll('-', '.')
  } catch {
    return iso
  }
}

// 记录页（M1 本地记录）：测试完成记录列表，按时间倒序，点击回看报告
export default function RecordsPage() {
  const records: TestRecord[] = loadTestRecords().filter((record) => getTestDefinition(record.testId))

  return (
    <View className="records-page">
      {records.length === 0 ? (
        <Text className="records-page__empty">还没有测试记录，去「测试」页看看吧。</Text>
      ) : (
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
      )}
    </View>
  )
}
