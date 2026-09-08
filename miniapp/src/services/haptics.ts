import { getWxGlobal } from './wxGlobal'

const HAPTICS_KEY = 'ptking_haptics_enabled'

export function isHapticsEnabled(): boolean {
  try {
    return getWxGlobal()?.getStorageSync?.(HAPTICS_KEY) !== false
  } catch {
    return true
  }
}

export function setHapticsEnabled(enabled: boolean): boolean {
  try {
    const platform = getWxGlobal()
    if (!platform?.setStorageSync) return false
    platform.setStorageSync(HAPTICS_KEY, enabled)
    return true
  } catch {
    return false
  }
}

/** 轻触反馈：选项确认等短交互。环境不支持时静默。 */
export function tapFeedback(): void {
  if (!isHapticsEnabled()) return
  try {
    getWxGlobal()?.vibrateShort?.({ type: 'light' })
  } catch {
    // 旧基础库或开发者工具可能没有该接口
  }
}
