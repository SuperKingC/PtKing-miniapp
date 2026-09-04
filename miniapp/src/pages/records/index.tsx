import { Image, Text, View } from '@tarojs/components'
import { getTestDefinition } from '../../services/testRegistry'
import { loadTestRecords, TEST_RECORDS_CAP, type TestRecord } from '../../services/testRecords'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { useAppTheme } from '../../hooks/useAppTheme'
import emptyRecordsImg from '../../assets/illus/empty-records.png'
import './index.scss'

function formatTime(iso: string): string {
  try {
    return iso.slice(0, 10).replaceAll('-', '.')
  } catch {
    return iso
  }
}

// 记录页：顶部统计摘要（总次数/测过数/最新结果）+ 全部记录列表（按时间倒序，点击回看报告）。
// 不过滤已下架测试：标题/结果优先取定义，缺失时回退落库快照——历史记录不随内容下架消失；
// 达到存储上限时提示最早记录会被自动清理，可去设置页手动清空
export default function RecordsPage() {
  useTabBarSelected(2)
  const theme = useAppTheme()
  const records: TestRecord[] = loadTestRecords()
  const testedCount = new Set(records.map((record) => record.testId)).size
  const latest = records[0]
  const latestLabel = latest
    ? getTestDefinition(latest.testId)?.reports[latest.result.reportId]?.title
      ?? latest.resultTitle
      ?? latest.result.reportId
    : '—'

  return (
    <View className={`records-page theme-${theme}`}>
      {records.length === 0 ? (
        <View className="records-page__empty">
          <Image className="records-page__empty-img" src={emptyRecordsImg} mode="aspectFit" />
          <Text className="records-page__empty-text">还没有测试记录，去「测试」页看看吧。</Text>
        </View>
      ) : (
        <>
          {records.length >= TEST_RECORDS_CAP && (
            <View className="records-page__cap">
              <Text className="records-page__cap-text">
                记录已达 {TEST_RECORDS_CAP} 条上限，最早的记录会自动清理；可在「我的 → 设置」里清空全部记录。
              </Text>
            </View>
          )}
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
              const definition = getTestDefinition(record.testId)
              const title = definition?.title ?? record.testTitle ?? record.testId
              const result = definition?.reports[record.result.reportId]?.title
                ?? record.resultTitle
                ?? record.result.reportId
              return (
                <View
                  key={`${record.testId}-${record.finishedAt}`}
                  className="records-page__item"
                  hoverClass="none"
                  onClick={() => {
                    wx.navigateTo({
                      url: `/pages/test-report/index?testId=${record.testId}&finishedAt=${encodeURIComponent(record.finishedAt)}`,
                    })
                  }}
                >
                  <View className="records-page__item-main">
                    <Text className="records-page__item-title">{title}</Text>
                    <Text className="records-page__item-result">{result}</Text>
                    {record.locked === true && <Text className="records-page__item-lock">待解锁</Text>}
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
