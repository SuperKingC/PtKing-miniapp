export const TAROT_TAB_ROUTE = 'pages/tarot/index'
export const TAROT_TAB_INDEX = 1

/** 乐观选中 storage key：tab 点击与页面 onShow 都写这里，tabbar 实例挂载时读取兜底 */
export const TABBAR_SELECTED_KEY = 'ptking:tabbar-selected'

/**
 * 栏在官方槽里（非 fixed），后台页实例不会叠到当前页上。
 * 只在塔罗全屏时藏栏。判定以「本实例所属页面路由」为准：tabbar 实例挂在各自
 * tab 页下，塔罗页的实例 ownRoute 必是塔罗路由——流程开着就藏，不信任 selected
 * （新实例挂载时路由可能为空、读到过期 storage 选中值，会把栏留在流程页上）；
 * 空 ownRoute 时退回按 selected/selectedRoute 判。
 */
export function shouldHideCustomTabBar(
  webviewRoute: string,
  selectedRoute: string,
  selectedIndex = -1,
  flowOpen = false,
): boolean {
  if (!flowOpen) return false
  if (tabPathToRoute(webviewRoute) === TAROT_TAB_ROUTE) return true
  if (selectedIndex >= 0) return selectedIndex === TAROT_TAB_INDEX
  return tabPathToRoute(selectedRoute || webviewRoute) === TAROT_TAB_ROUTE
}

export const TAROT_FLOW_VISIBILITY_EVENT = 'ptking:tarot-flow-visibility'

export function tabPathToRoute(path: string): string {
  return path.replace(/^\//, '')
}

const TAB_ROUTES = [
  'pages/test/index',
  'pages/tarot/index',
  'pages/records/index',
  'pages/me/index',
] as const

/** 按当前页路由给出 tab 索引，避免新实例默认停在「测试」再闪到目标 tab */
export function tabIndexFromRoute(route: string): number {
  const index = (TAB_ROUTES as readonly string[]).indexOf(tabPathToRoute(route))
  return index >= 0 ? index : 0
}
