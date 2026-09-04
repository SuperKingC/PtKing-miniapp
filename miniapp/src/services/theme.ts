/**
 * 主题偏好（暗色模式手动切换）：
 * - 偏好存本地 storage：auto（跟随系统，默认）/ light / dark。
 * - 「跟随系统」的初始值由 app.config darkmode + theme.json 承担；手动切换时
 *   useAppTheme hook 调 applyThemeChrome 动态覆盖导航栏与窗口底色，
 *   页面内容用根节点 .theme-light / .theme-dark 类名覆盖 CSS 变量。
 * wx 访问走 getWxGlobal（node/vitest 无 wx 静默兜底）。
 */
import { getWxGlobal } from './wxGlobal'

export type ThemePreference = 'auto' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

/** 我的页主题选择变更后的全局广播（tab 页常驻，靠事件刷新根类名） */
export const THEME_CHANGE_EVENT = 'ptking:theme-changed'

const STORAGE_KEY = 'ptking_theme_preference'

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  auto: '跟随系统',
  light: '浅色',
  dark: '深色',
}

export const THEME_PREFERENCE_ORDER: ThemePreference[] = ['auto', 'light', 'dark']

/** 纯函数核心（可单测）：偏好 + 系统主题 → 最终主题 */
export function resolveTheme(pref: ThemePreference, systemTheme: string | undefined): ResolvedTheme {
  if (pref === 'auto') return systemTheme === 'dark' ? 'dark' : 'light'
  return pref
}

export function getThemePreference(): ThemePreference {
  try {
    const raw = getWxGlobal()?.getStorageSync?.(STORAGE_KEY)
    return raw === 'light' || raw === 'dark' ? raw : 'auto'
  } catch {
    return 'auto'
  }
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    if (pref === 'auto') getWxGlobal()?.removeStorageSync?.(STORAGE_KEY)
    else getWxGlobal()?.setStorageSync?.(STORAGE_KEY, pref)
  } catch {
    // 存储失败不阻断：下次启动仍可用当前选择
  }
}

/** 当前系统主题（wx.getSystemInfoSync().theme；无值/light 环境一律 light） */
export function currentSystemTheme(): ResolvedTheme {
  try {
    return getWxGlobal()?.getSystemInfoSync?.().theme === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** 导航栏 + 窗口底色随主题动态覆盖（theme.json 管「跟随系统」初始值，手动切换由此接管） */
export function applyThemeChrome(theme: ResolvedTheme): void {
  try {
    getWxGlobal()?.setNavigationBarColor?.({
      frontColor: theme === 'dark' ? '#ffffff' : '#000000',
      backgroundColor: theme === 'dark' ? '#211b16' : '#f7f4ee',
    })
  } catch {
    // 个别环境不支持时由 theme.json 兜底
  }
  try {
    getWxGlobal()?.setBackgroundColor?.({
      backgroundColor: theme === 'dark' ? '#191411' : '#f7f4ee',
    })
  } catch {
    // 忽略
  }
}