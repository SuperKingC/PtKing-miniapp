import { useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { getTestDefinition, listTestDefinitions } from '../../services/testRegistry'
import { listActiveTestDrafts } from '../../services/testDrafts'
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

function summarize(records: TestRecord[]) {
  const latest = records[0]
  const latestLabel = latest
    ? getTestDefinition(latest.testId)?.reports[latest.result.reportId]?.title
      ?? latest.resultTitle
      ?? latest.result.reportId
    : '—'
  return {
    testedCount: new Set(records.map((record) => record.testId)).size,
    latestLabel,
  }
}

// 记录页：顶部统计摘要（总次数/测过数/最新结果）+ 全部记录列表（按时间倒序，点击回看报告）。
// tab 页常驻，每次显示时重新读本地记录。
export default function RecordsPage() {
  useTabBarSelected(2)
  const theme = useAppTheme()
  const [records, setRecords] = useState(() => loadTestRecords())
  const [resume, setResume] = useState(() => listActiveTestDrafts(listTestDefinitions())[0] ?? null)
  const { testedCount, latestLabel } = summarize(records)

  useDidShow(() => {
    setRecords(loadTestRecords())
    setResume(listActiveTestDrafts(listTestDefinitions())[0] ?? null)
  })

  const resumeBanner = resume ? (
    <View
      className="records-page__resume"
      hoverClass="none"
      onClick={() => {
        wx.navigateTo({ url: `/pages/test-play/index?testId=${resume.definition.id}` })
      }}
    >
      <Text className="records-page__resume-kicker">继续答题</Text>
      <Text className="records-page__resume-title">{resume.definition.title}</Text>
      <Text className="records-page__resume-meta">
        已答到第 {resume.draft.questionIndex + 1}/{resume.definition.questions.length} 题
      </Text>
    </View>
  ) : null

  return (
    <View className={`tab-page theme-${theme}`}>
    <ScrollView
      className="tab-page__scroll records-page"
      scrollY
      enhanced
      showScrollbar={false}
    >
      {resumeBanner}
      {records.length === 0 ? (
        <View className="records-page__empty">
          <Image className="records-page__empty-img" src={emptyRecordsImg} mode="aspectFit" lazyLoad />
          <Text className="records-page__empty-text">还没有测试记录，去测测子看看吧。</Text>
          <View
            className="records-page__empty-btn"
            hoverClass="none"
            onClick={() => {
              wx.switchTab({ url: '/pages/test/index' })
            }}
          >
            <Text>去测试中心</Text>
          </View>
        </View>
      ) : (
        <>
          {records.length >= TEST_RECORDS_CAP && (
            <View className="records-page__cap">
              <Text className="records-page__cap-text">
                记录已达 {TEST_RECORDS_CAP} 条上限，最早的记录会自动清理；可在「我的 → 清空测试记录」里清空全部记录。
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
    </ScrollView>
    </View>
  )
}
