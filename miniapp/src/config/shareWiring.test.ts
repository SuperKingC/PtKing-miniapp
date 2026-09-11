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
    expect(report).toContain('category: definition.category')
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
    expect(me).toContain('me-page__switch')
    expect(me).toContain("changeTheme(on ? 'dark' : 'light')")
    expect(me).not.toContain('跟随系统')
    expect(me).not.toContain('动效')
    expect(me).toContain('me-banner-panel-v4.png')
    expect(me).toContain('className="me-page__banner-img" src={meBannerImg} mode="widthFix"')
    expect(me).toContain('版本 {APP_VERSION}')
    expect(me).toContain('icon-me-clear-v8.png')
    expect(me).toContain('icon-me-theme-v8.png')
    expect(me).toContain('icon-me-haptics-v8.png')
    expect(me).not.toContain('icon-me-clear-v7.png')
    expect(me).toContain('偏好设置')
    expect(me).not.toContain('shadow-slab-v1.png')
    expect(me).not.toContain('me-page__slab-shadow')
    expect(me).not.toContain('me-page__slab')
    expect(me).toContain('me-page__banner-clip')
    expect(me).toContain('me-page__entries-clip')
    expect(me).toContain('me-page__prefs-clip')
    expect(me).toContain('className="tab-page__scroll"')
    expect(me).not.toContain('enhanced')
    expect(me).toContain('me-page__icon')
    expect(me).not.toContain('me-page__banner-text')
    expect(me).not.toContain('me-page__banner-title')
    expect(me).not.toContain('APP_DISPLAY_NAME')
    expect(me).not.toContain('me-page__banner-version')
    expect(me).not.toContain('测试记录仅保存在本机')
    const banner = me.match(/<View className="me-page__banner[^"]*">[\s\S]*?<View className="me-page__entries[^"]*">/)?.[0]
    expect(banner).toBeTruthy()
    expect(banner).not.toContain('onClick')
    expect(banner).not.toContain('navigateTo')
  })

  it('fills the me-page brand card and keeps version in the footer', () => {
    const styles = readFileSync(resolve(miniappRoot(), 'src/pages/me/index.scss'), 'utf8')
    const appStyles = readFileSync(resolve(miniappRoot(), 'src/app.scss'), 'utf8')
    expect(styles).toMatch(/\.me-page__banner \{[^}]*overflow: hidden/)
    expect(styles).toMatch(/\.me-page__banner \{[^}]*border-radius: 40rpx/)
    expect(styles).toMatch(/\.me-page__banner-img \{[^}]*width: 100%;[^}]*height: auto;/)
    // 横幅不画 box-shadow 内阴影（透明圆角 PNG，投影由容器 --shadow-card 承担）；safe-area/padding 的 inset 字样不在此限
    expect(styles).not.toMatch(/box-shadow:[^;]*inset/)
    expect(styles).not.toContain('width: 134%')
    expect(styles).toMatch(/\.theme-dark \.me-page__banner-img \{[^}]*brightness/)
    // item 外边缘厚度标准（2026-09-11 定稿）：--shadow-card 实色接触带三层法，四处令牌同构。
    const cardTokens = [...appStyles.matchAll(/--shadow-card:([^;]+);/g)]
    expect(cardTokens).toHaveLength(4)
    for (const [, value] of cardTokens) {
      expect(value).toMatch(/0 [46]rpx 0/)
      expect(value).toMatch(/0 2?0rpx (28|30)rpx/)
    }
    expect(cardTokens[0][1]).toBe(cardTokens[2][1])
    expect(appStyles).not.toContain('--shadow-slab')
    expect([...appStyles.matchAll(/--shadow-image:/g)]).toHaveLength(4)
    expect(styles).not.toContain('.me-page__banner-title')
    expect(styles).not.toContain('.me-page__banner-veil')
    expect(styles).toMatch(/\.me-page__foot \{[\s\S]*?justify-content: center/)
    expect(styles).toMatch(/\.me-page__foot-version \{[\s\S]*?text-align: center/)
    expect(styles).toMatch(/\.me-page \{[\s\S]*?padding: calc\(var\(--page-top-inset, 88px\) \+ 8rpx\) 40rpx 40rpx/)
    expect(styles).not.toContain('.me-page__slab-shadow')
    // 品牌图沿透明轮廓投影；列表/偏好卡走标准实色接触带三层法（0 6rpx 0）。
    expect(styles).toMatch(/\.me-page__entries \{[^}]*box-shadow:[^;]*0 6rpx 0/)
    expect(styles).toMatch(/\.me-page__prefs \{[^}]*box-shadow:[^;]*0 6rpx 0/)
    expect(appStyles).toContain('--shadow-card:')
    expect(styles).toMatch(/\.me-page__icon \{[^}]*filter: none/)
    expect(styles).toMatch(/\.me-page__icon \{[^}]*width: 84rpx;[^}]*height: 84rpx/)
    expect(styles).toMatch(/\.me-page__arrow \{[^}]*font-size: 48rpx/)
    expect(styles).toMatch(/\.me-page__entries \{[^}]*background: #faf6ee/)
    expect(styles).toMatch(/\.me-page__prefs \{[^}]*background: #faf6ee/)
    const tabStyles = readFileSync(resolve(miniappRoot(), 'src/custom-tab-bar/index.scss'), 'utf8')
    expect(tabStyles).toMatch(/\.tabbar__icon \{[^}]*width: 104rpx;[^}]*height: 104rpx/)
    expect(styles).toMatch(/\.me-page__switch \{[\s\S]*?width: 100rpx;[\s\S]*?height: 52rpx/)
  })

  it('keeps the tarot page share title wiring from Pet10', () => {
    const tarotPage = readFileSync(resolve(miniappRoot(), 'src/pages/tarot/index.tsx'), 'utf8')

    expect(tarotPage).toContain('useShareAppMessage')
    expect(tarotPage).toContain('tarotShareTitle')
  })
})
