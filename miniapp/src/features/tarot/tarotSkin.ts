/**
 * 塔罗皮肤偏好：clay（测测子的牌桌，默认）/ classic（星夜圣殿）。
 * - 偏好存本地 storage；流程层与入口页读取侧各自取值，不支持流程中途换肤。
 * - 资产路径由 tarotAssets.ts 按 skin 拼接，两套皮肤各自预加载 24 张。
 * wx 访问走 getWxGlobal（node/vitest 无 wx 静默兜底）。
 */
import { getWxGlobal } from '../../services/wxGlobal'

export type TarotSkin = 'clay' | 'classic'

export const TAROT_SKIN_LABELS: Record<TarotSkin, string> = {
  clay: '测测子的牌桌',
  classic: '星夜圣殿',
}

export const TAROT_SKIN_ORDER: TarotSkin[] = ['clay', 'classic']

const STORAGE_KEY = 'ptking_tarot_skin'

export function getTarotSkin(): TarotSkin {
  try {
    const raw = getWxGlobal()?.getStorageSync?.(STORAGE_KEY)
    return raw === 'classic' ? 'classic' : 'clay'
  } catch {
    return 'clay'
  }
}

export function setTarotSkin(skin: TarotSkin): void {
  try {
    getWxGlobal()?.setStorageSync?.(STORAGE_KEY, skin)
  } catch {
    // 存储失败不阻断：下次启动仍可用当前选择
  }
}
