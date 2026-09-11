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
    expect(home).toContain('pickDailyTest')
    expect(home).toContain('openDetail(daily.id)')
    expect(home).toContain('hero-card-v4.png')
    expect(home).not.toContain('去测 ›')
    expect(home).not.toContain('scrollIntoView')
    expect(home).not.toContain('card-benefit')
    expect(home).not.toContain('观察关系里的相处方式')
  })

  it('fills the official tab slot and switches tabs with a native switchTab', () => {
    const styles = source('custom-tab-bar/index.scss')
    const appStyles = source('app.scss')
    const tabBar = source('custom-tab-bar/index.tsx')
    expect(tabBar).toContain('tabbar__dock')
    expect(tabBar).not.toContain('tabbar__safe')
    expect(styles).toContain('height: 100%')
    expect(styles).toContain('min-height: 160rpx')
    expect(styles).not.toContain('position: fixed')
    expect(styles).toContain('width: 104rpx')
    expect(styles).toContain('font-size: 22rpx')
    expect(styles).toContain('justify-content: center')
    expect(styles).toContain('background: #f7f4ee')
    expect(styles).toContain('background-color: #f3e5d1')
    expect(styles).not.toContain('rgba(255, 255, 255')
    expect(appStyles).toContain('custom-tab-bar')
    expect(tabBar).toContain('onClick={() => this.switchTo(index)}')
    expect(tabBar).toMatch(/switchTo = \(index: number\) => \{[\s\S]*?switchTab\(\{ url \}\)/)
    expect(tabBar).not.toMatch(/switchTo = [\s\S]*?applyVisibility/)
  })

  it('答题剩余按已答统计，保存成功才清草稿，不上报具体选项', () => {
    const play = source('pages/test-play/index.tsx')
    expect(play).toContain('getPlayProgress(answers.length, total)')
    expect(play).not.toContain('qIndex, optionIndex })')
    expect(play).toContain('if (!saved)')
    expect(play.indexOf('if (!saved)')).toBeLessThan(play.indexOf('clearTestDraft(definition.id)', play.indexOf('const result = scoreTest')))
    expect(play).toContain('reportSnapshot:')
    expect(play).toContain('motion-${motionPreference}')
    expect(play).not.toContain('PLAY_CONFIRM_MS')
    expect(play).toContain('test-play__restoring')
  })

  it('详情、答题、报告补齐开始、离开、展开、再测和相关测试', () => {
    const detail = source('pages/test-detail/index.tsx')
    const play = source('pages/test-play/index.tsx')
    const report = source('pages/test-report/index.tsx')

    expect(detail).toContain("trackEvent('test_start_click'")
    expect(detail).toContain('没有标准答案，按最近的通常状态和第一反应选择即可。')
    expect(detail).not.toContain('你会看到')
    expect(play).toContain("trackEvent('test_leave'")
    expect(play).toContain('useUnload')
    expect(play).toContain('completedRef.current = true')
    expect(play).toContain("trackEvent('test_answer', { testId: definition.id, qIndex })")
    expect(report).toContain("trackEvent('report_fold'")
    expect(report).toContain("trackEvent('report_retest'")
    expect(report).toContain("trackEvent('report_related'")
    expect(report).toContain('const [openDetail, setOpenDetail] = useState(true)')
    expect(report).not.toContain('这份结果像你吗')
    expect(report).not.toContain('saveReportFeedback')
  })

  it('interactive surfaces use a shared press class instead of hover none', () => {
    const files = [
      'pages/test/index.tsx',
      'pages/test-detail/index.tsx',
      'pages/test-play/index.tsx',
      'pages/test-report/index.tsx',
      'pages/records/index.tsx',
      'custom-tab-bar/index.tsx',
    ]
    for (const file of files) {
      const text = source(file)
      expect(text).toContain('pressable--pressed')
    }
    expect(source('app.scss')).toContain('.pressable--pressed')
  })

  it('keeps the privacy page left-aligned with a separate header', () => {
    const page = source('pages/privacy/index.tsx')
    const styles = source('pages/privacy/index.scss')
    expect(page).toContain('privacy-page__header')
    expect(styles).toContain('text-align: left')
    expect(styles).not.toContain('text-align: justify')
  })
})
