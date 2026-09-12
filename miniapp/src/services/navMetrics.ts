/**
 * 自定义导航栏（navigationStyle: custom）后的顶部安全距离：
 * - 内容起始 y = 胶囊按钮底边 + 8px 呼吸（getMenuButtonBoundingClientRect），
 *   胶囊不可用时兜底 statusBarHeight + 48px；
 * - 结果写入页面根节点 CSS 变量 --page-top-inset（px），各页 padding-top 引用。
 * wx 访问走 getWxGlobal（node/vitest 无 wx 静默兜底 88px）。
 */
import { getWxGlobal } from './wxGlobal'

/** 兜底值：无胶囊/无状态栏信息时的保守估计（iPhone 常规值附近） */
export const FALLBACK_TOP_INSET_PX = 88

/** 左上返回圆钮直径（px）：与 .test-*-__back 的 88rpx 同尺寸（750 设计宽 1rpx=0.5px） */
export const BACK_BUTTON_SIZE_PX = 44

/** 胶囊（右上角菜单钮）高度兜底（px）：getMenuButtonBoundingClientRect 未给 height 时用 */
export const FALLBACK_MENU_HEIGHT_PX = 32

interface MenuRect {
  bottom?: number
  height?: number
  top?: number
}

interface WindowInfo {
  statusBarHeight?: number
}

/** 纯函数核心（可单测）：胶囊位置 + 状态栏高 → 内容起始 inset(px) */
export function resolveTopInsetPx(menu: MenuRect | undefined, statusBarHeight: number | undefined): number {
  const menuBottom = menu?.bottom
  if (typeof menuBottom === 'number' && menuBottom > 0) return menuBottom + 8
  if (typeof statusBarHeight === 'number' && statusBarHeight > 0) return statusBarHeight + 48
  return FALLBACK_TOP_INSET_PX
}

/**
 * 纯函数核心（可单测）：返回钮中心与胶囊中心对齐时的 fixed top(px)。
 * 胶囊可用时 = 胶囊底边 - 胶囊高/2 - 钮高/2（胶囊中心的三个点图标同高）；
 * 否则退回 statusBarHeight + 8（贴状态栏下沿）。保证按钮不随页面滚动。
 */
export function resolveFixedBackTopPx(
  menu: MenuRect | undefined,
  statusBarHeight: number | undefined,
  sizePx = BACK_BUTTON_SIZE_PX,
): number {
  const menuBottom = menu?.bottom
  if (typeof menuBottom === 'number' && menuBottom > 0) {
    const menuHeight = typeof menu?.height === 'number' && menu.height > 0 ? menu.height : FALLBACK_MENU_HEIGHT_PX
    return Math.max(0, menuBottom - menuHeight / 2 - sizePx / 2)
  }
  if (typeof statusBarHeight === 'number' && statusBarHeight > 0) return statusBarHeight + 8
  return FALLBACK_TOP_INSET_PX - sizePx
}

function readMenuRect(): MenuRect | undefined {
  try {
    return getWxGlobal()?.getMenuButtonBoundingClientRect?.() as MenuRect | undefined
  } catch {
    return undefined
  }
}

function readStatusBarHeight(): number | undefined {
  const wx = getWxGlobal()
  try {
    const info = (wx?.getWindowInfo?.() ?? wx?.getSystemInfoSync?.()) as WindowInfo | undefined
    return info?.statusBarHeight
  } catch {
    return undefined
  }
}

// 顶部安全距离在同一设备一次启动内不会变；topInsetStyle() 会在每次渲染被调用，
// 不记忆就会在塔罗流程里读上百次窗口信息。按 wx 实例身份记忆，换 mock/冷启动自动失效。
let cachedInsetWx: unknown
let cachedInsetPx: number | null = null

export function getTopInsetPx(): number {
  const wx = getWxGlobal()
  if (wx === cachedInsetWx && cachedInsetPx !== null) return cachedInsetPx
  try {
    const info = (wx?.getWindowInfo?.() ?? wx?.getSystemInfoSync?.()) as WindowInfo | undefined
    cachedInsetPx = resolveTopInsetPx(readMenuRect(), info?.statusBarHeight)
  } catch {
    cachedInsetPx = FALLBACK_TOP_INSET_PX
  }
  cachedInsetWx = wx
  return cachedInsetPx
}

/** 结果写入指定页面根元素的 CSS 变量；root 为空时静默跳过 */
export function applyTopInset(
  element: { style?: { setProperty?: (name: string, value: string) => void } } | undefined | null,
): void {
  element?.style?.setProperty?.('--page-top-inset', `${getTopInsetPx()}px`)
}

/** Taro 内联样式：`--page-top-inset: 88px`，页面根节点 style 属性直接展开 */
export function topInsetStyle(): Record<string, string> {
  return { '--page-top-inset': `${getTopInsetPx()}px` }
}

/**
 * 左上返回钮的悬浮定位：中心与右上角胶囊（三个点图标）中心对齐，固定在视口不随页面滚动。
 * 以 `--back-top` 变量注入页面根节点，`.test-*-__back` 用 position: fixed + top: var(...)。
 */
export function fixedBackTop(): number {
  return resolveFixedBackTopPx(readMenuRect(), readStatusBarHeight())
}

/** Taro 内联样式：`--back-top: 40px`，返回钮 fixed top 由它驱动 */
export function backButtonStyle(): Record<string, string> {
  return { '--back-top': `${fixedBackTop()}px` }
}
