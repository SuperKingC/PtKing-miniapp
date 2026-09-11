import { describe, expect, it } from 'vitest'
import { shouldHideCustomTabBar, tabIndexFromRoute, tabPathToRoute } from './tabBarVisibility'

describe('custom tab bar visibility', () => {
  it('shows the bright tarot home', () => {
    expect(shouldHideCustomTabBar('pages/tarot/index', 'pages/tarot/index', 1)).toBe(false)
  })

  it('hides the tarot page instance whenever its flow is open, selected state notwithstanding', () => {
    expect(shouldHideCustomTabBar('', 'pages/tarot/index', 1, true)).toBe(true)
    // 塔罗实例挂载时读到过期 storage 选中值（如「记录」），流程开着也必须藏栏
    expect(shouldHideCustomTabBar('pages/tarot/index', 'pages/records/index', 2, true)).toBe(true)
    expect(shouldHideCustomTabBar('pages/tarot/index', '', -1, true)).toBe(true)
    expect(shouldHideCustomTabBar('', 'pages/tarot/index', 1, false)).toBe(false)
  })

  it('keeps a background tab instance visible when it is not tarot', () => {
    expect(shouldHideCustomTabBar('pages/test/index', 'pages/records/index', 2)).toBe(false)
    expect(shouldHideCustomTabBar('pages/me/index', 'pages/records/index', 2)).toBe(false)
    expect(shouldHideCustomTabBar('', 'pages/test/index', 0)).toBe(false)
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

  it('resolves the selected tab from the current route', () => {
    expect(tabIndexFromRoute('pages/test/index')).toBe(0)
    expect(tabIndexFromRoute('/pages/tarot/index')).toBe(1)
    expect(tabIndexFromRoute('pages/records/index')).toBe(2)
    expect(tabIndexFromRoute('/pages/me/index')).toBe(3)
    expect(tabIndexFromRoute('')).toBe(0)
  })
})
