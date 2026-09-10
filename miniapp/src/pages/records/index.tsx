import { useMemo, useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getTestDefinition, listTestDefinitions } from '../../services/testRegistry'
import { listActiveTestDrafts } from '../../services/testDrafts'
import { deleteTestRecord, loadTestRecords, TEST_RECORDS_CAP, type TestRecord } from '../../services/testRecords'
import { buildRecordInsight, filterRecords, recordCategoryTone, shortenLabel, type RecordCategory } from '../../domain/recordInsights'
import { pickRecommendedTests } from '../../services/testDiscovery'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { useAppTheme } from '../../hooks/useAppTheme'
import emptyRecordsImg from '../../assets/illus/empty-records-v2.png'
import './index.scss'

const CATEGORIES: RecordCategory[] = ['全部', '人格', '情感', '职场', '趣味']

function formatTime(iso: string): string {
  try {
    return iso.slice(0, 10).replace(/-/g, '.')
  } catch {
    return iso
  }
}

function summarize(records: TestRecord[]) {
  const latest = records[0]
  const latestLabel = latest
    ? latest.reportSnapshot?.title
      ?? getTestDefinition(latest.testId)?.reports[latest.result.reportId]?.title
      ?? latest.resultTitle
      ?? latest.result.reportId
    : '—'
  return {
    testedCount: new Set(records.map((record) => record.testId)).size,
    latestLabel,
  }
}

export default function RecordsPage() {
  useTabBarSelected(2)
  const theme = useAppTheme()
  const [records, setRecords] = useState(() => loadTestRecords())
  const [resume, setResume] = useState(() => listActiveTestDrafts(listTestDefinitions())[0] ?? null)
  const [category, setCategory] = useState<RecordCategory>('全部')
  const definitions = listTestDefinitions()
  const categories = useMemo(
    () => Object.fromEntries(definitions.map((item) => [item.id, item.category])) as Record<string, RecordCategory>,
    [definitions],
  )
  const visible = filterRecords(records, category, categories)
  const { testedCount, latestLabel } = summarize(records)
  const insight = useMemo(() => {
    const grouped = new Map<string, TestRecord[]>()
    records.forEach((record) => {
      const list = grouped.get(record.testId) ?? []
      list.push(record)
      grouped.set(record.testId, list)
    })
    const repeated = [...grouped.values()].find((list) => list.length > 1)
    if (!repeated) return null
    const sameVersion = !repeated[0].contentSignature || !repeated[1].contentSignature || repeated[0].contentSignature === repeated[1].contentSignature
    return buildRecordInsight(repeated, sameVersion)
  }, [records])
  const firstTest = pickRecommendedTests(definitions, [], undefined, 1)[0] ?? definitions[0]

  useDidShow(() => {
    setRecords(loadTestRecords())
    setResume(listActiveTestDrafts(listTestDefinitions())[0] ?? null)
  })

  const removeRecord = (record: TestRecord) => {
    Taro.showModal({
      title: '删除这条记录？',
      content: '只删除这一次结果，不会影响其他记录。',
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        if (!deleteTestRecord(record.testId, record.finishedAt)) {
          Taro.showToast({ title: '删除未完成，请重试', icon: 'none' })
          return
        }
        setRecords(loadTestRecords())
      },
    })
  }

  const resumeBanner = resume ? (
    <View
      className="records-page__resume"
      hoverClass="pressable--pressed"
      onClick={() => {
        Taro.navigateTo({ url: `/pages/test-play/index?testId=${resume.definition.id}` })
      }}
    >
      <Text className="records-page__resume-kicker">继续答题</Text>
      <Text className="records-page__resume-title">{resume.definition.title}</Text>
      <Text className="records-page__resume-meta">
        已完成 {resume.draft.answers.length}/{resume.definition.questions.length} 题
      </Text>
    </View>
  ) : null

  return (
    <View className={`tab-page theme-${theme}`}>
    <ScrollView className="tab-page__scroll" scrollY enhanced showScrollbar={false}>
      <View className="records-page">
      {resumeBanner}
      {records.length === 0 ? (
        <View className="records-page__empty">
          <Image className="records-page__empty-img" src={emptyRecordsImg} mode="aspectFit" lazyLoad />
          <Text className="records-page__empty-text">还没有测试记录，先从推荐测试开始。</Text>
          <View
            className="records-page__empty-btn"
            hoverClass="pressable--pressed"
            onClick={() => {
              if (firstTest) {
                Taro.navigateTo({ url: `/pages/test-detail/index?testId=${firstTest.id}` })
                return
              }
              Taro.switchTab({ url: '/pages/test/index' })
            }}
          >
            <Text>{firstTest ? `去测 ${firstTest.title}` : '去测试中心'}</Text>
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
          {insight && (
            <View className="records-page__insight">
              <Text className="records-page__insight-title">最近重复测</Text>
              <Text className="records-page__insight-text">
                {getTestDefinition(insight.testId)?.title ?? insight.testId}已测 {insight.attempts} 次。{insight.message}。分数变化只描述本次与上次，不代表变好或变差。
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
              <Text className="records-page__stat-value">{shortenLabel(latestLabel)}</Text>
              <Text className="records-page__stat-label">最新结果</Text>
            </View>
          </View>
          <View className="records-page__chips">
            {CATEGORIES.map((item) => (
              <View
                key={item}
                className={category === item ? 'records-page__chip records-page__chip--on' : 'records-page__chip'}
                hoverClass="pressable--pressed"
                onClick={() => setCategory(item)}
              >
                <Text>{item}</Text>
              </View>
            ))}
          </View>
          <View className="records-page__list">
            {visible.map((record) => {
              const definition = getTestDefinition(record.testId)
              const title = definition?.title ?? record.testTitle ?? record.testId
              const result = record.reportSnapshot?.title
                ?? definition?.reports[record.result.reportId]?.title
                ?? record.resultTitle
                ?? record.result.reportId
              const tone = recordCategoryTone(definition?.category ?? categories[record.testId])
              return (
                <View key={`${record.testId}-${record.finishedAt}`} className={`records-page__item records-page__item--${tone}`}>
                  <View className="records-page__item-bar" />
                  <View
                    className="records-page__item-main"
                    hoverClass="pressable--pressed"
                    onClick={() => {
                      Taro.navigateTo({
                        url: `/pages/test-report/index?testId=${record.testId}&finishedAt=${encodeURIComponent(record.finishedAt)}`,
                      })
                    }}
                  >
                    <View className="records-page__item-head">
                      <Text className="records-page__item-cat">{definition?.category ?? '测试'}</Text>
                      <Text className="records-page__item-time">{formatTime(record.finishedAt)}</Text>
                    </View>
                    <Text className="records-page__item-title">{title}</Text>
                    <Text className="records-page__item-result">{result}</Text>
                    {record.locked === true && <Text className="records-page__item-lock">待解锁</Text>}
                  </View>
                  <Text className="records-page__item-delete" onClick={() => removeRecord(record)}>删除</Text>
                </View>
              )
            })}
          </View>
        </>
      )}
      </View>
    </ScrollView>
    </View>
  )
}
