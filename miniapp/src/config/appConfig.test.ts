import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

const TAB_PAGES = ['pages/test/index', 'pages/tarot/index', 'pages/records/index', 'pages/me/index'] as const
const TAB_ICONS = [
  'test-v2.png',
  'test-active-v2.png',
  'tarot-v2.png',
  'tarot-active-v2.png',
  'records-v2.png',
  'records-active-v2.png',
  'me-v2.png',
  'me-active-v2.png',
] as const

describe('WeChat app config (M0 skeleton)', () => {
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

  it('registers the settings and privacy sub pages with source files', () => {
    const configSource = readFileSync(resolve(miniappRoot(), 'src/app.config.ts'), 'utf8')
    for (const page of ['pages/settings/index', 'pages/privacy/index'] as const) {
      expect(configSource).toContain(`'${page}'`)
      expect(existsSync(resolve(miniappRoot(), 'src', `${page}.tsx`))).toBe(true)
    }
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
  })
})
