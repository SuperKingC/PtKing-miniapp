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

// 皮肤在流程挂载时定死，但 getTarotSkin 会被每张牌渲染调用；若每次都读 storage，
// 扇形/翻牌阶段一秒能读上百次。这里按 wx 实例身份做会话级记忆：同一实例只读一次，
// 换实例（测试替换 mock / 冷启动）自动失效重读，不会读到脏值。
let cachedWx: unknown
let cachedSkin: TarotSkin | null = null

export function getTarotSkin(): TarotSkin {
  const wx = getWxGlobal()
  if (wx === cachedWx && cachedSkin) return cachedSkin
  try {
    const raw = wx?.getStorageSync?.(STORAGE_KEY)
    cachedSkin = raw === 'classic' ? 'classic' : 'clay'
  } catch {
    cachedSkin = 'clay'
  }
  cachedWx = wx
  return cachedSkin
}

export function setTarotSkin(skin: TarotSkin): void {
  try {
    getWxGlobal()?.setStorageSync?.(STORAGE_KEY, skin)
    // 写成功即同步记忆，保证同会话后续读取立刻看到新皮肤
    cachedWx = getWxGlobal()
    cachedSkin = skin
  } catch {
    // 存储失败不阻断：下次启动仍可用当前选择；记忆不更新，读取仍反映实际存储值
  }
}
