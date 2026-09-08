import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { miniappRoot } from './testPaths'

const source = (file: string) => readFileSync(resolve(miniappRoot(), 'src', file), 'utf8')

describe('体验入口契约', () => {
  it('滚动视口无内容padding，间距交由内部容器承载', () => {
    const home = source('pages/test/index.tsx')
    expect(home).toContain('className="tab-page__scroll"')
    expect(home).toContain('<View className="test-page">')
    expect(home).toContain('scrollIntoView={scrollTarget}')
  })

  it('答题剩余按已答统计，保存成功才清草稿，不上报具体选项', () => {
    const play = source('pages/test-play/index.tsx')
    expect(play).toContain('getPlayProgress(answers.length, total)')
    expect(play).not.toContain('qIndex, optionIndex })')
    expect(play).toContain('if (!saved)')
    expect(play.indexOf('if (!saved)')).toBeLessThan(play.indexOf('clearTestDraft(definition.id)', play.indexOf('const result = scoreTest')))
    expect(play).toContain('reportSnapshot:')
    expect(play).toContain('motion-${motionPreference}')
  })

  it('详情、答题、报告补齐开始、离开、展开、再测和相关测试', () => {
    const detail = source('pages/test-detail/index.tsx')
    const play = source('pages/test-play/index.tsx')
    const report = source('pages/test-report/index.tsx')

    expect(detail).toContain("trackEvent('test_start_click'")
    expect(play).toContain("trackEvent('test_leave'")
    expect(play).toContain('useUnload')
    expect(play).toContain('completedRef.current = true')
    expect(play).toContain("trackEvent('test_answer', { testId: definition.id, qIndex })")
    expect(report).toContain("trackEvent('report_fold'")
    expect(report).toContain("trackEvent('report_retest'")
    expect(report).toContain("trackEvent('report_related'")
  })
})
