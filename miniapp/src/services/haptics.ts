import { getWxGlobal } from './wxGlobal'

const HAPTICS_KEY = 'ptking_haptics_enabled'
const DEFAULT_PULSE_MS = 220

export type HapticImpact = 'heavy' | 'medium' | 'light'

let pulseTimer: ReturnType<typeof setInterval> | null = null

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

function vibrate(run: (wx: NonNullable<ReturnType<typeof getWxGlobal>>) => void): void {
  if (!isHapticsEnabled()) return
  try {
    const platform = getWxGlobal()
    if (!platform) return
    run(platform)
  } catch {
    // 旧基础库或开发者工具可能没有该接口
  }
}

/** 轻触反馈：选项确认等短交互。环境不支持时静默。 */
export function tapFeedback(): void {
  impactFeedback('light')
}

/** 短震：抽牌 / 切牌 / 翻牌等一次性仪式节点。 */
export function impactFeedback(type: HapticImpact = 'light'): void {
  vibrate((platform) => platform.vibrateShort?.({ type }))
}

/** 长震：进入解读等更重的收束节点。 */
export function longFeedback(): void {
  vibrate((platform) => platform.vibrateLong?.())
}

/** 洗牌长按：按间隔连续短震，松手必须 stop。 */
export function startPulseHaptics(intervalMs = DEFAULT_PULSE_MS): void {
  if (!isHapticsEnabled()) return
  stopPulseHaptics()
  impactFeedback('medium')
  pulseTimer = setInterval(() => impactFeedback('medium'), intervalMs)
}

export function stopPulseHaptics(): void {
  if (pulseTimer === null) return
  clearInterval(pulseTimer)
  pulseTimer = null
}
