import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import {
  THEME_CHANGE_EVENT,
  applyThemeChrome,
  currentSystemTheme,
  getThemePreference,
  resolveTheme,
  type ResolvedTheme,
} from '../services/theme'

/**
 * 全局主题 hook（页面层接线用）：
 * 偏好（auto/light/dark，storage 持久化）+ 系统主题 → 最终主题。
 * - 主题偏好变更走 eventCenter 广播（tab 页常驻，切偏好时在页更新根类名）。
 * - 同时返回「最终主题」，页面根节点挂 theme-light / theme-dark 类名。
 * - 导航栏与窗口底色的动态覆盖在此统一执行（跟随系统时与 theme.json 同值）。
 * 塔罗页不接此 hook：沉浸式深色页面，不参与主题切换。
 */
export function useAppTheme(): ResolvedTheme {
  const [pref, setPref] = useState(() => getThemePreference())
  const [system, setSystem] = useState(() => currentSystemTheme())

  // 偏好变更广播（我的页切换主题时触发）
  useEffect(() => {
    const onPrefChange = () => setPref(getThemePreference())
    Taro.eventCenter.on(THEME_CHANGE_EVENT, onPrefChange)
    return () => {
      Taro.eventCenter.off(THEME_CHANGE_EVENT, onPrefChange)
    }
  }, [])

  // 系统主题变化（仅影响 auto 档的解析结果）
  useEffect(() => {
    try {
      const handler = (res: { theme?: string }) => setSystem(res?.theme === 'dark' ? 'dark' : 'light')
      Taro.onThemeChange?.(handler)
      return () => {
        Taro.offThemeChange?.(handler)
      }
    } catch {
      return undefined
    }
  }, [])

  const theme = resolveTheme(pref, system)

  useEffect(() => {
    applyThemeChrome(theme)
  }, [theme])

  return theme
}