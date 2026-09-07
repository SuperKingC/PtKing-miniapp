export const TAROT_TAB_ROUTE = 'pages/tarot/index'

/**
 * 自定义 tabBar 每页各有一份，且是 position:fixed。
 * 后台页实例真机上不会随 switchTab 卸掉，必须自己藏起来，否则叠成双栏。
 */
export function shouldHideCustomTabBar(
  ownRoute: string,
  isCurrentPage: boolean,
  selectedIndex?: number,
  tarotRoute = TAROT_TAB_ROUTE,
  tarotIndex = 1,
): boolean {
  if (ownRoute === tarotRoute) return true
  if (isCurrentPage && selectedIndex === tarotIndex) return true
  return !isCurrentPage
}
