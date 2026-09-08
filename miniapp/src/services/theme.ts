/**
 * 主题偏好（仅浅色 / 深色，不跟随系统）：
 * - 偏好存本地 storage：light（默认）/ dark。历史 auto 视为 light。
 * - 切换时 useAppTheme 调 applyThemeChrome 覆盖导航栏与窗口底色，
 *   页面内容用根节点 .theme-light / .theme-dark 类名覆盖 CSS 变量。
 * wx 访问走 getWxGlobal（node/vitest 无 wx 静默兜底）。
 */
import { getWxGlobal } from './wxGlobal'

export type ThemePreference = 'light' | 'dark'
/** 兼容旧存储值 auto；解析时视为跟随系统，读取时已折叠为 light */
export type ThemePreferenceInput = ThemePreference | 'auto'
export type ResolvedTheme = 'light' | 'dark'

/** 我的页主题选择变更后的全局广播（tab 页常驻，靠事件刷新根类名） */
export const THEME_CHANGE_EVENT = 'ptking:theme-changed'

const STORAGE_KEY = 'ptking_theme_preference'

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  light: '浅色',
  dark: '深色',
}

export const THEME_PREFERENCE_ORDER: ThemePreference[] = ['light', 'dark']

/** 纯函数核心（可单测）：偏好 + 系统主题 → 最终主题 */
export function resolveTheme(pref: ThemePreferenceInput, systemTheme: string | undefined): ResolvedTheme {
  if (pref === 'auto') return systemTheme === 'dark' ? 'dark' : 'light'
  return pref
}

export function getThemePreference(): ThemePreference {
  try {
    const raw = getWxGlobal()?.getStorageSync?.(STORAGE_KEY)
    return raw === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    getWxGlobal()?.setStorageSync?.(STORAGE_KEY, pref)
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

let appliedThemeChrome: ResolvedTheme | null = null

/** 测试用：清掉导航底色缓存，避免用例互相污染 */
export function resetThemeChromeForTests(): void {
  appliedThemeChrome = null
}

/** 导航栏 + 窗口底色随主题动态覆盖（theme.json 提供双套色值，手动切换由此接管） */
export function applyThemeChrome(theme: ResolvedTheme): void {
  if (appliedThemeChrome === theme) return
  appliedThemeChrome = theme
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