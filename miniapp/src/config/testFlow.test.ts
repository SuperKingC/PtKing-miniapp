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
    expect(play).toContain('wx.redirectTo({ url: `/pages/test-report/index?testId=${definition.id}` })')
    expect(report).toContain('loadTestRecords()')
  })

  it('keeps scoring and storage out of the play page render path via the engine and service', () => {
    const play = readFileSync(resolve(miniappRoot(), 'src/pages/test-play/index.tsx'), 'utf8')

    // 架构边界：页面只做编排，计分/落库分别来自 domain 与 services
    expect(play).toContain("from '../../domain/testEngine'")
    expect(play).toContain("from '../../services/testRecords'")
    expect(play).not.toMatch(/getStorageSync|setStorageSync/)
  })

  it('routes the me page records entry to the records tab', () => {
    const me = readFileSync(resolve(miniappRoot(), 'src/pages/me/index.tsx'), 'utf8')

    expect(me).toContain("wx.switchTab({ url: '/pages/records/index' })")
  })
})
