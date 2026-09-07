import { describe, expect, it } from 'vitest'
import { shouldHideCustomTabBar } from './tabBarVisibility'

describe('custom tab bar visibility', () => {
  it('hides the tarot page instance even when that page is current', () => {
    expect(shouldHideCustomTabBar('pages/tarot/index', true, 1)).toBe(true)
  })

  it('hides the current page when the selected tab is tarot even if route is empty', () => {
    expect(shouldHideCustomTabBar('', true, 1)).toBe(true)
  })

  it('hides any instance that no longer belongs to the current page', () => {
    expect(shouldHideCustomTabBar('pages/test/index', false, 2)).toBe(true)
    expect(shouldHideCustomTabBar('pages/records/index', false, 2)).toBe(true)
  })

  it('shows the current non-tarot page instance', () => {
    expect(shouldHideCustomTabBar('pages/records/index', true, 2)).toBe(false)
    expect(shouldHideCustomTabBar('pages/me/index', true, 3)).toBe(false)
  })
})
