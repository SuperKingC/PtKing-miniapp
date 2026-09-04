import { useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { scoreTest } from '../../domain/testEngine'
import { getTestDefinition } from '../../services/testRegistry'
import { saveTestRecord } from '../../services/testRecords'
import './index.scss'

// 答题页（对应「做梦心理」答题版式）：顶部细进度条 + 右上角 n/N + 居中题干 + 双答案卡 + 左右翻页圆钮。
// 支持回退上一题改答案；最后一题作答即计分落记录并跳报告页
export default function TestPlayPage() {
  const router = useRouter()
  const definition = useMemo(() => getTestDefinition(router.params.testId ?? ''), [router.params.testId])
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])

  if (!definition) {
    return (
      <View className="test-play">
        <Text className="test-play__missing">测试不存在或已下架</Text>
      </View>
    )
  }

  const total = definition.questions.length
  const question = definition.questions[qIndex]
  const progress = Math.round((answers.length / total) * 100)
  // 回退后题目与已选答案的联动：当前题已答则高亮已选项
  const chosen = answers[qIndex]

  const choose = (optionIndex: number) => {
    const nextAnswers =
      qIndex === answers.length
        ? [...answers, optionIndex]
        : answers.map((value, index) => (index === qIndex ? optionIndex : value))
    setAnswers(nextAnswers)
    if (nextAnswers.length === total && qIndex === total - 1) {
      const result = scoreTest(definition, nextAnswers)
      saveTestRecord(definition.id, result)
      wx.redirectTo({ url: `/pages/test-report/index?testId=${definition.id}` })
      return
    }
    if (qIndex === answers.length) {
      setQIndex(qIndex + 1)
    }
  }

  const goPrev = () => {
    if (qIndex > 0) setQIndex(qIndex - 1)
  }

  const goNext = () => {
    // 只允许在已答过题上前进（前进到已答的下一题或已答区的任意位置）
    if (qIndex < answers.length && qIndex < total - 1) setQIndex(qIndex + 1)
  }

  return (
    <View className="test-play">
      <View className="test-play__progress-track">
        <View className="test-play__progress-fill" style={{ width: `${progress}%` }} />
      </View>
      <Text className="test-play__counter">{qIndex + 1}/{total}</Text>
      <Text className="test-play__question">{qIndex + 1}. {question.text}</Text>
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
