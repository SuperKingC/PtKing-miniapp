import type { TarotReading } from './tarotReading'

/**
 * 塔罗解读历史（本地 storage，最新在前，上限 20 条）。
 * 用守卫式 wx 全局读写（不在模块顶层 import Taro：node/vitest 里静态导入即崩），
 * 读侧对非数组/坏结构一律回退空数组。
 */
const historyKey = 'ptking_tarot_history'
const historyLimit = 20

function readRaw(): unknown {
  try {
    const wxApi = (globalThis as { wx?: { getStorageSync?: (key: string) => unknown } }).wx
    return wxApi?.getStorageSync?.(historyKey)
  } catch {
    return []
  }
}

function writeRaw(payload: TarotReading[]): void {
  try {
    const wxApi = (globalThis as { wx?: { setStorageSync?: (key: string, value: unknown) => void } }).wx
    wxApi?.setStorageSync?.(historyKey, payload)
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
