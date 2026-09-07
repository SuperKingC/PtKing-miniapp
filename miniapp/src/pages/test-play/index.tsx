import { useEffect, useMemo, useRef, useState } from 'react'
import { Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { useAppTheme } from '../../hooks/useAppTheme'
import { scoreTest } from '../../domain/testEngine'
import { captureError, trackEvent } from '../../services/monitor'
import { isRewardedAdConfigured } from '../../services/rewardedAd'
import { getTestDefinition } from '../../services/testRegistry'
import { saveTestRecord } from '../../services/testRecords'
import {
  clearTestDraft,
  getTestContentSignature,
  getTestDraft,
  offerResumeTestDraft,
  saveTestDraft,
} from '../../services/testDrafts'
import './index.scss'

// 答题页（对应「做梦心理」答题版式）：顶部细进度条 + 右上角 n/N + 居中题干 + 双答案卡 + 左右翻页圆钮。
// 支持回退上一题改答案；最后一题作答即计分落记录并跳报告页。
// 中途答案写入本地草稿，再次进入可继续或重新开始；题库热更后草稿失效。
// 广告位已配置时新记录落库 locked=true（报告页看激励视频解锁）；未配置不落锁，报告直接展示
export default function TestPlayPage() {
  const router = useRouter()
  const theme = useAppTheme()
  const definition = useMemo(() => getTestDefinition(router.params.testId ?? ''), [router.params.testId])
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const resumeAskedRef = useRef(false)

  // 答题漏斗：进入答题页（有已答后续题数可对照流失）
  useEffect(() => {
    if (definition) trackEvent('test_start', { testId: definition.id })
  }, [definition])

  useEffect(() => {
    if (!definition || resumeAskedRef.current) return
    resumeAskedRef.current = true
    const draft = getTestDraft(definition)
    if (!draft) return
    void offerResumeTestDraft(draft).then((resume) => {
      if (resume) {
        setAnswers(draft.answers)
        setQIndex(draft.questionIndex)
      } else {
        clearTestDraft(definition.id)
      }
    })
  }, [definition])

  if (!definition) {
    return (
      <View className={`test-play theme-${theme}`}>
        <Text className="test-play__missing">测试不存在或已下架</Text>
      </View>
    )
  }

  const persistDraft = (nextAnswers: number[], nextIndex: number) => {
    saveTestDraft(definition, {
      testId: definition.id,
      contentSignature: getTestContentSignature(definition),
      answers: nextAnswers,
      questionIndex: nextIndex,
      updatedAt: Date.now(),
      expiresAt: Date.now(),
    })
  }

  const total = definition.questions.length
  const question = definition.questions[qIndex]
  const progress = Math.round(((qIndex + 1) / total) * 100)
  // 回退后题目与已选答案的联动：当前题已答则高亮已选项
  const chosen = answers[qIndex]

  const choose = (optionIndex: number) => {
    const nextAnswers =
      qIndex === answers.length
        ? [...answers, optionIndex]
        : answers.map((value, index) => (index === qIndex ? optionIndex : value))
    setAnswers(nextAnswers)
    trackEvent('test_answer', { testId: definition.id, qIndex, optionIndex })
    if (nextAnswers.length === total && qIndex === total - 1) {
      // 计分引擎抛错（如动态定义缺字段）不能断流程：捕获上报 + 提示重试
      try {
        const result = scoreTest(definition, nextAnswers)
        clearTestDraft(definition.id)
        saveTestRecord(definition.id, result, {
          locked: isRewardedAdConfigured(),
          testTitle: definition.title,
          resultTitle: definition.reports[result.reportId]?.title,
        })
        trackEvent('test_complete', { testId: definition.id, reportId: result.reportId })
        wx.redirectTo({ url: `/pages/test-report/index?testId=${definition.id}` })
      } catch (err) {
        persistDraft(nextAnswers, qIndex)
        captureError(err, 'score_test_failed')
        wx.showToast({ title: '报告生成失败，请重试', icon: 'none' })
      }
      return
    }
    const nextIndex = qIndex === answers.length ? qIndex + 1 : qIndex
    if (qIndex === answers.length) {
      setQIndex(nextIndex)
    }
    persistDraft(nextAnswers, nextIndex)
  }

  const goPrev = () => {
    if (qIndex <= 0) return
    const nextIndex = qIndex - 1
    setQIndex(nextIndex)
    persistDraft(answers, nextIndex)
  }

  const goNext = () => {
    // 只允许在已答过题上前进（前进到已答的下一题或已答区的任意位置）
    if (qIndex < answers.length && qIndex < total - 1) {
      const nextIndex = qIndex + 1
      setQIndex(nextIndex)
      persistDraft(answers, nextIndex)
    }
  }

  return (
    <View className={`test-play theme-${theme}`}>
      <View className="test-play__progress-track">
        <View className="test-play__progress-fill" style={{ width: `${progress}%` }} />
      </View>
      <Text className="test-play__counter">{qIndex + 1}/{total}</Text>
      <Text key={qIndex} className="test-play__question">{qIndex + 1}. {question.text}</Text>
      {/* 2 选项（MBTI 型二分题）横排大卡；3+ 选项（长文本场景题）纵向堆叠全宽卡，避免文字挤压竖排 */}
      <View className={question.options.length > 2 ? 'test-play__options test-play__options--stack' : 'test-play__options'}>
        {question.options.map((option, optionIndex) => (
          <View
            key={option.text}
            className={
              chosen === optionIndex
                ? 'test-play__option test-play__option--active'
                : 'test-play__option'
            }
            hoverClass="none"
            onClick={() => choose(optionIndex)}
          >
            {question.options.length > 2 && (
              <Text className={chosen === optionIndex ? 'test-play__option-key test-play__option-key--active' : 'test-play__option-key'}>
                {String.fromCharCode(65 + optionIndex)}
              </Text>
            )}
            <Text className="test-play__option-text">{option.text}</Text>
          </View>
        ))}
      </View>
      <View className="test-play__nav">
        <View
          className={qIndex > 0 ? 'test-play__nav-btn' : 'test-play__nav-btn test-play__nav-btn--disabled'}
          hoverClass="none"
          onClick={goPrev}
        >
          <Text>←</Text>
        </View>
        <View
          className={
            qIndex < answers.length && qIndex < total - 1
              ? 'test-play__nav-btn'
              : 'test-play__nav-btn test-play__nav-btn--disabled'
          }
          hoverClass="none"
          onClick={goNext}
        >
          <Text>→</Text>
        </View>
      </View>
    </View>
  )
}
