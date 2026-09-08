import { getWxGlobal } from './wxGlobal'

export type MotionPreference = 'system' | 'standard' | 'reduced'

export const MOTION_PREFERENCE_ORDER: MotionPreference[] = ['system', 'standard', 'reduced']
export const MOTION_PREFERENCE_LABELS: Record<MotionPreference, string> = {
  system: '跟随系统',
  standard: '标准',
  reduced: '简洁',
}

const MOTION_KEY = 'ptking_motion_preference'
const listeners = new Set<() => void>()

export function getMotionPreference(): MotionPreference {
  try {
    const value = getWxGlobal()?.getStorageSync?.(MOTION_KEY)
    return value === 'standard' || value === 'reduced' || value === 'system' ? value : 'system'
  } catch {
    return 'system'
  }
}

export function setMotionPreference(preference: MotionPreference): boolean {
  try {
    const platform = getWxGlobal()
    if (!platform?.setStorageSync) return false
    platform.setStorageSync(MOTION_KEY, preference)
    listeners.forEach((listener) => listener())
    return true
  } catch {
    return false
  }
}

export function subscribeMotionPreference(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
