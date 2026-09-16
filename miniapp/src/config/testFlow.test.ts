import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

const FLOW_PAGES = ['pages/test-detail/index', 'pages/test-play/index', 'pages/test-report/index'] as const

describe('test flow pages (M1)', () => {
  it('registers the three flow pages in app.config', () => {
    const configSource = readFileSync(resolve(miniappRoot(), 'src/app.config.ts'), 'utf8')
    for (const page of FLOW_PAGES) {
      expect(configSource).toContain(`'${page}'`)
    }
  })

  it('ships source files and page configs for every flow page', () => {
    for (const page of FLOW_PAGES) {
      expect(resolve(miniappRoot(), 'src', `${page}.tsx`)).toBeTruthy()
    }
  })

  it('navigates the full flow: center → detail → play → report', () => {
    const center = readFileSync(resolve(miniappRoot(), 'src/pages/test/index.tsx'), 'utf8')
    const detail = readFileSync(resolve(miniappRoot(), 'src/pages/test-detail/index.tsx'), 'utf8')
    const play = readFileSync(resolve(miniappRoot(), 'src/pages/test-play/index.tsx'), 'utf8')
    const report = readFileSync(resolve(miniappRoot(), 'src/pages/test-report/index.tsx'), 'utf8')

    expect(center).toContain('/pages/test-detail/index?testId=')
    expect(detail).toContain('/pages/test-play/index?testId=')
    expect(play).toContain('scoreTest(')
    expect(play).toContain('saveTestRecord(')
    expect(play).toContain('wx.redirectTo({')
    expect(play).toContain('/pages/test-report/index?testId=${encodeURIComponent(definition.id)}')
    expect(report).toContain('loadTestRecords()')
  })

  it('keeps scoring and storage out of the play page render path via the engine and service', () => {
    const play = readFileSync(resolve(miniappRoot(), 'src/pages/test-play/index.tsx'), 'utf8')

    // 架构边界：页面只做编排，计分/落库分别来自 domain 与 services
    expect(play).toContain("from '../../domain/testEngine'")
    expect(play).toContain("from '../../services/testRecords'")
    expect(play).not.toMatch(/getStorageSync|setStorageSync/)
  })

  it('gives conditional report radar canvases unique IDs and selects the matching chart', () => {
    const report = readFileSync(resolve(miniappRoot(), 'src/pages/test-report/index.tsx'), 'utf8')
    const canvasIds = [...report.matchAll(/<(?:canvas|Canvas)\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1])
    const radarIds = canvasIds.filter((id) => id.endsWith('-radar'))

    expect(radarIds).toHaveLength(2)
    expect(new Set(radarIds).size).toBe(radarIds.length)
    expect(radarIds).toContain('report-factor-radar')
    expect(radarIds).toContain('report-archetype-radar')
    expect(report).toMatch(/const radarCanvasId = factorScores\.length >= 3\s*\? 'report-factor-radar'\s*: 'report-archetype-radar'/)
    expect(report).toContain('.select(`#${radarCanvasId}`)')
    expect(report).toContain('[radarScores, radarCanvasId, darkTheme, locked]')
    expect(report).toContain('if (locked || radarScores.length < 3) return')
    expect(report).toContain('FoldPanel')
    expect(report).toContain('这次可能更接近')
    expect(report).toContain('可以先试这一步')
    // 2026-09 用户要求:报告页 hero 卡不再渲染免责声明(test-detail 页保留)
    expect(report).not.toContain('APP_ENTERTAINMENT_DISCLAIMER')
    expect(report).toContain('再看一个相关测试')
    expect(report).toContain('先回测试中心')
    expect(report).toContain('useState(true)')
    expect(report).toContain('{index + 1}')
    expect(report).not.toContain('{index + 2}')
    expect(report).toContain('abortNote')
    expect(report).toContain('radarAxisLabel')
    expect(report).toContain('fillText')
  })

  it('refreshes records on show and lets empty state jump back to tests', () => {
    const records = readFileSync(resolve(miniappRoot(), 'src/pages/records/index.tsx'), 'utf8')
    const detail = readFileSync(resolve(miniappRoot(), 'src/pages/test-detail/index.tsx'), 'utf8')
    expect(records).toContain('useDidShow')
    expect(records).toContain('setRecords(loadTestRecords())')
    expect(records).toMatch(/switchTab\(\{ url: '\/pages\/test\/index' \}\)/)
    /* 介绍页只保留续答入口（有草稿显示「继续测试」）；重开走答题页离开确认 */
    expect(detail).toContain('getTestDraft')
    expect(detail).toContain('继续测试')
    expect(detail).not.toContain('重新开始')
    expect(detail).not.toContain('clearTestDraft')
  })

  it('hides native scrollbars on the scrolling tab pages', () => {
    const records = readFileSync(resolve(miniappRoot(), 'src/pages/records/index.tsx'), 'utf8')
    const testPage = readFileSync(resolve(miniappRoot(), 'src/pages/test/index.tsx'), 'utf8')
    const me = readFileSync(resolve(miniappRoot(), 'src/pages/me/index.tsx'), 'utf8')
    const recordsConfig = readFileSync(resolve(miniappRoot(), 'src/pages/records/index.config.ts'), 'utf8')
    const appStyles = readFileSync(resolve(miniappRoot(), 'src/app.scss'), 'utf8')

    for (const source of [records, testPage]) {
      expect(source).toContain('showScrollbar={false}')
      expect(source).toContain('enhanced')
      expect(source).toContain('tab-page')
      expect(source).toContain('tab-page__scroll')
    }
    // 我的页不挂 ScrollView：版本号露出来时页面不能拖
    expect(me).not.toContain('ScrollView')
    expect(me).toContain('catchMove')
    expect(me).not.toContain('enhanced')
    expect(me).toContain('tab-page')
    expect(me).toContain('tab-page__scroll')
    expect(recordsConfig).toContain('disableScroll: true')
    expect(appStyles).toContain('::-webkit-scrollbar')
    expect(appStyles).toContain('scroll-view::-webkit-scrollbar')
    expect(appStyles).toContain('width: 100%')
    expect(appStyles).not.toContain('calc(100% + 20rpx)')
  })
})
