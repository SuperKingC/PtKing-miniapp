import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { miniappRoot } from './testPaths'

// M4 分享契约：分享入口三处齐备——全局开启菜单、报告页结果标题、塔罗页解读标题
describe('share capability wiring', () => {
  it('opens the share menu once at app launch', () => {
    const app = readFileSync(resolve(miniappRoot(), 'src/app.tsx'), 'utf8')
    const service = readFileSync(resolve(miniappRoot(), 'src/services/shareMenu.ts'), 'utf8')

    expect(app).toContain('showShareMenu()')
    expect(app).toMatch(/useEffect\(\(\) => \{\s*showShareMenu\(\)/)
    expect(service).toContain('getWxGlobal()?.showShareMenu')
  })

  it('registers result-flavored share titles on the report page', () => {
    const report = readFileSync(resolve(miniappRoot(), 'src/pages/test-report/index.tsx'), 'utf8')

    expect(report).toContain('useShareAppMessage')
    expect(report).toContain('buildReportShareTitle')
    expect(report).toContain('shareHookByCategory')
    expect(report).toContain('shareCardDisclaimer')
  })

  it('shares the report to moments and offers an in-page share button', () => {
    const report = readFileSync(resolve(miniappRoot(), 'src/pages/test-report/index.tsx'), 'utf8')

    // 朋友圈分享（showShareMenu 已开 shareTimeline 菜单，页面需声明 useShareTimeline）
    expect(report).toContain('useShareTimeline')
    // 页内分享按钮（微信转发入口）
    expect(report).toContain('openType="share"')
    // 好友卡片直达该测试详情页，引导开测
    expect(report).toContain('/pages/test-detail/index?testId=')
  })

  it('wires the me-page entries: data management inline + contact sessions', () => {
    const me = readFileSync(resolve(miniappRoot(), 'src/pages/me/index.tsx'), 'utf8')

    expect(me).toContain('clearTestRecords()')
    expect(me).not.toContain('未完成测试')
    expect(me).not.toContain('已做测试')
    expect(me).not.toContain('塔罗历史')
    expect(me).toContain('/pages/privacy/index')
    expect(me).toContain("openType={entry.contact ? 'contact' : undefined}")
  })

  it('keeps the tarot page share title wiring from Pet10', () => {
    const tarotPage = readFileSync(resolve(miniappRoot(), 'src/pages/tarot/index.tsx'), 'utf8')

    expect(tarotPage).toContain('useShareAppMessage')
    expect(tarotPage).toContain('tarotShareTitle')
  })
})
