import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

const TAB_PAGES = ['pages/test/index', 'pages/tarot/index', 'pages/records/index', 'pages/me/index'] as const
const TAB_ICONS = [
  'test-alpha.png',
  'test-active-alpha.png',
  'tarot-alpha.png',
  'tarot-active-alpha.png',
  'records-alpha.png',
  'records-active-alpha.png',
  'me-alpha.png',
  'me-active-alpha.png',
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
})
