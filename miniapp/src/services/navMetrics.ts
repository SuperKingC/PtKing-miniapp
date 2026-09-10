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

export function getTopInsetPx(): number {
  const wx = getWxGlobal()
  try {
    const info = (wx?.getWindowInfo?.() ?? wx?.getSystemInfoSync?.()) as WindowInfo | undefined
    const menu = wx?.getMenuButtonBoundingClientRect?.() as MenuRect | undefined
    return resolveTopInsetPx(menu, info?.statusBarHeight)
  } catch {
    return FALLBACK_TOP_INSET_PX
  }
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
