export const TAROT_TAB_ROUTE = 'pages/tarot/index'
export const TAROT_TAB_INDEX = 1

/**
 * 栏在官方槽里（非 fixed），后台页实例不会叠到当前页上。
 * 只在塔罗全屏时藏栏；空路由或后台页不要藏，否则会留下点不中的官方白槽。
 */
export function shouldHideCustomTabBar(
  webviewRoute: string,
  selectedRoute: string,
  selectedIndex = -1,
  flowOpen = false,
): boolean {
  if (!flowOpen) return false
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
