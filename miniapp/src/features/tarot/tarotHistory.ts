import type { TarotReading } from './tarotReading'
import { getWxGlobal } from '../../services/wxGlobal'

/**
 * 塔罗解读历史（本地 storage，最新在前，上限 20 条）。
 * wx 访问统一走 getWxGlobal（不静态 import Taro：node/vitest 里导入即崩；
 * 真机闭包注入兼容见 wxGlobal.ts），读侧对非数组/坏结构一律回退空数组。
 */
const historyKey = 'ptking_tarot_history'
const historyLimit = 20

/** 我的页「塔罗历史」入口 → 塔罗页打开历史面板（eventCenter 广播，tab 页常驻监听） */
export const TAROT_HISTORY_OPEN_EVENT = 'ptking:tarot-history-open'

function readRaw(): unknown {
  try {
    return getWxGlobal()?.getStorageSync?.(historyKey)
  } catch {
    return []
  }
}

function writeRaw(payload: TarotReading[]): void {
  try {
    getWxGlobal()?.setStorageSync?.(historyKey, payload)
  } catch {
    // 历史是增强功能，写失败不阻断主流程
  }
}

/** 纯函数核心（可单测）：校验并过滤存储内容 */
export function parseTarotHistory(raw: unknown): TarotReading[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is TarotReading =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as TarotReading).question === 'string' &&
      Array.isArray((item as TarotReading).drawn),
  )
}

export function listTarotHistory(): TarotReading[] {
  return parseTarotHistory(readRaw())
}

export function saveTarotReading(reading: TarotReading): void {
  writeRaw([reading, ...listTarotHistory()].slice(0, historyLimit))
}

/** 设置页「清空塔罗历史」：清空后历史面板与入口计数即恢复空态 */
export function clearTarotHistory(): void {
  try {
    getWxGlobal()?.removeStorageSync?.(historyKey)
  } catch {
    // 清理失败不阻断
  }
}
