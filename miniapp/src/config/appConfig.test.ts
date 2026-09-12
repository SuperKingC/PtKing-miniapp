import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

const TAB_PAGES = ['pages/test/index', 'pages/tarot/index', 'pages/records/index', 'pages/me/index'] as const
const TAB_ICONS = [
  'icon-tab-test-v17s.png',
  'icon-tab-test-active-v17s.png',
  'icon-tab-tarot-v18s.png',
  'icon-tab-tarot-active-v18s.png',
  'icon-tab-records-v17s.png',
  'icon-tab-records-active-v17s.png',
  'icon-tab-me-v17s.png',
  'icon-tab-me-active-v17s.png',
] as const

describe('WeChat app config (M0 skeleton)', () => {
  it('reads the local COS address file so device builds are not stuck on the placeholder host', () => {
    const taroConfig = readFileSync(resolve(miniappRoot(), 'config/index.ts'), 'utf8')
    expect(taroConfig).toContain('.asset-base-url')
    expect(taroConfig).toContain('readLocalAssetBaseUrl')
  })

  it('declares exactly the four tab pages and enables required component injection', () => {
    const configSource = readFileSync(resolve(miniappRoot(), 'src/app.config.ts'), 'utf8')

    expect(configSource).toContain("lazyCodeLoading: 'requiredComponents'")
    for (const page of TAB_PAGES) {
      expect(configSource).toContain(`'${page}'`)
    }
  })

  it('registers a native tabBar whose entries match the declared pages', () => {
    const configSource = readFileSync(resolve(miniappRoot(), 'src/app.config.ts'), 'utf8')

    expect(configSource).toContain('tabBar:')
    expect(configSource).toContain('custom: true')
    expect((configSource.match(/pagePath/g) ?? []).length).toBe(TAB_PAGES.length)
    for (const page of TAB_PAGES) {
      expect(configSource).toContain(`pagePath: '${page}'`)
    }
  })

  it('references tabBar icon files that exist as bundled source assets', () => {
    const configSource = readFileSync(resolve(miniappRoot(), 'src/app.config.ts'), 'utf8')
    const tabbarAssetDir = resolve(miniappRoot(), 'src/assets/tabbar')

    for (const icon of TAB_ICONS) {
      expect(configSource).toContain(`assets/tabbar/${icon}`)
      expect(existsSync(resolve(tabbarAssetDir, icon))).toBe(true)
    }
  })

  it('copies the tabbar assets into dist so app.json icon paths resolve', () => {
    const configSource = readFileSync(resolve(miniappRoot(), 'config/index.ts'), 'utf8')

    expect(configSource).toContain("from: 'src/assets/tabbar/'")
    expect(configSource).toContain("to: 'dist/assets/tabbar/'")
  })

  it('ships a source file for every declared page', () => {
    for (const page of TAB_PAGES) {
      expect(existsSync(resolve(miniappRoot(), 'src', `${page}.tsx`))).toBe(true)
    }
  })

  it('registers the privacy sub page with its source file (settings merged into me page)', () => {
    const configSource = readFileSync(resolve(miniappRoot(), 'src/app.config.ts'), 'utf8')

    expect(configSource).toContain("'pages/privacy/index'")
    expect(existsSync(resolve(miniappRoot(), 'src/pages/privacy/index.tsx'))).toBe(true)
    // 设置内容并入我的页后，settings 页不应再注册
    expect(configSource).not.toContain("'pages/settings/index'")
  })

  it('enables dark mode and routes nav/tab colors through theme variables', () => {
    const configSource = readFileSync(resolve(miniappRoot(), 'src/app.config.ts'), 'utf8')

    expect(configSource).toContain('darkmode: true')
    expect(configSource).toContain("themeLocation: 'theme.json'")
    expect(configSource).toContain("'@navBgColor'")
    expect(configSource).toContain("'@tabBgColor'")

    // theme.json 必须提供双主题的全部变量（导航/背景/tabBar）
    const theme = JSON.parse(readFileSync(resolve(miniappRoot(), 'src/theme.json'), 'utf8')) as Record<
      string,
      Record<string, string>
    >
    for (const variant of ['light', 'dark'] as const) {
      expect(theme[variant]).toBeTruthy()
      for (const key of ['navBgColor', 'navTxtStyle', 'bgColor', 'tabColor', 'tabSelectedColor', 'tabBgColor', 'tabBorderStyle']) {
        expect(typeof theme[variant][key]).toBe('string')
      }
    }
    expect(theme.light.tabBgColor).toBe(theme.light.bgColor)
    expect(theme.dark.tabBgColor).toBe(theme.dark.bgColor)
    expect(theme.light.navBgColor).toBe(theme.light.bgColor)
    expect(theme.dark.navBgColor).toBe(theme.dark.bgColor)
    expect(theme.dark.navBgColor).toBe('#191411')
  })

  it('uses 测测子 as the navigation title on every page and does not hardcode nav colors', () => {
    const pageConfigs = [
      'pages/test/index.config.ts',
      'pages/tarot/index.config.ts',
      'pages/records/index.config.ts',
      'pages/me/index.config.ts',
      'pages/test-detail/index.config.ts',
      'pages/test-play/index.config.ts',
      'pages/test-report/index.config.ts',
      'pages/privacy/index.config.ts',
    ] as const

    for (const file of pageConfigs) {
      const src = readFileSync(resolve(miniappRoot(), 'src', file), 'utf8')
      expect(src).toContain("navigationBarTitleText: '测测子'")
      expect(src).not.toMatch(/navigationBarBackgroundColor:\s*'#/)
    }

    const themeHook = readFileSync(resolve(miniappRoot(), 'src/hooks/useAppTheme.ts'), 'utf8')
    const tarotPage = readFileSync(resolve(miniappRoot(), 'src/pages/tarot/index.tsx'), 'utf8')
    expect(themeHook).toContain('useDidShow')
    expect(themeHook).toContain('applyThemeChrome')
    expect(tarotPage).toContain('useAppTheme')
  })

  it('hides the custom tab bar on the tarot tab without native hideTabBar', () => {
    const tabBarSource = readFileSync(resolve(miniappRoot(), 'src/custom-tab-bar/index.tsx'), 'utf8')
    const tabBarVisibility = readFileSync(resolve(miniappRoot(), 'src/custom-tab-bar/tabBarVisibility.ts'), 'utf8')
    const tabBarStyles = readFileSync(resolve(miniappRoot(), 'src/custom-tab-bar/index.scss'), 'utf8')
    const tarotPage = readFileSync(resolve(miniappRoot(), 'src/pages/tarot/index.tsx'), 'utf8')

    expect(tarotPage).not.toContain('Taro.hideTabBar')
    expect(tarotPage).not.toContain('Taro.showTabBar')
    expect(tabBarSource).toContain('shouldHideCustomTabBar')
    expect(tabBarVisibility).toContain("pages/tarot/index")
    expect(tabBarSource).toContain('tabbar--hidden')
    expect(tabBarStyles).toContain('display: none')
  })
})
