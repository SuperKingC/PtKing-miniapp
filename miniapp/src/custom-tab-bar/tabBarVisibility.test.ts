import { describe, expect, it } from 'vitest'
import { shouldHideCustomTabBar, tabPathToRoute } from './tabBarVisibility'

describe('custom tab bar visibility', () => {
  it('hides the tarot page instance even when that page is current', () => {
    expect(shouldHideCustomTabBar('pages/tarot/index', 'pages/tarot/index', 1)).toBe(true)
  })

  it('hides when the selected tab is tarot', () => {
    expect(shouldHideCustomTabBar('pages/test/index', 'pages/tarot/index', 1)).toBe(true)
    expect(shouldHideCustomTabBar('', 'pages/tarot/index', 1)).toBe(true)
  })

  it('hides a background tab instance after switching to records', () => {
    expect(shouldHideCustomTabBar('pages/test/index', 'pages/records/index', 2)).toBe(true)
    expect(shouldHideCustomTabBar('pages/me/index', 'pages/records/index', 2)).toBe(true)
  })

  it('shows the records tab instance when records is selected', () => {
    expect(shouldHideCustomTabBar('pages/records/index', 'pages/records/index', 2)).toBe(false)
    expect(shouldHideCustomTabBar('pages/test/index', 'pages/test/index', 0)).toBe(false)
    expect(shouldHideCustomTabBar('pages/me/index', 'pages/me/index', 3)).toBe(false)
  })

  it('normalizes tab paths to routes', () => {
    expect(tabPathToRoute('/pages/records/index')).toBe('pages/records/index')
    expect(tabPathToRoute('pages/records/index')).toBe('pages/records/index')
  })
})
