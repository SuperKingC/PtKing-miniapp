import { getWxGlobal } from './wxGlobal'

/** 轻触反馈：选项确认等短交互。环境不支持时静默。 */
export function tapFeedback(): void {
  try {
    getWxGlobal()?.vibrateShort?.({ type: 'light' })
  } catch {
    // 旧基础库或开发者工具可能没有该接口
  }
}
