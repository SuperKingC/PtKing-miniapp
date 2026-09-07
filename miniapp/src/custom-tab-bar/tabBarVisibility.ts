export const TAROT_TAB_ROUTE = 'pages/tarot/index'
export const TAROT_TAB_INDEX = 1

/**
 * 自定义 tabBar 在 iOS 常是单例、安卓常是每 tab 一份，且都是 position:fixed。
 * 用「当前 webview 栈顶路由」对「选中 tab 路由」判断，不用页面对象身份
 * （Taro 真机包装对象 !== 栈顶页，会把记录页误藏）。
 */
export function shouldHideCustomTabBar(
  webviewRoute: string,
  selectedRoute: string,
  selectedIndex = -1,
  tarotRoute = TAROT_TAB_ROUTE,
  tarotIndex = TAROT_TAB_INDEX,
): boolean {
  if (webviewRoute === tarotRoute) return true
  if (selectedIndex === tarotIndex) return true
  if (selectedRoute === tarotRoute) return true
  return !webviewRoute || webviewRoute !== selectedRoute
}

export function tabPathToRoute(path: string): string {
  return path.replace(/^\//, '')
}
