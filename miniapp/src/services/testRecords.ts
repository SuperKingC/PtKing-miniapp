import type { TestResult } from '../domain/testEngine'
import { getWxGlobal } from './wxGlobal'

/**
 * 测试记录存储（M1 本地 storage 版；M2 迁服务端，关联 openid 跨设备同步）。
 * 注意 Taro getStorageSync 无值时返回空串而非 undefined（Pet10 698990d 教训），
 * 读取必须加 typeof 守卫。wx 访问统一走 getWxGlobal（真机闭包注入兼容，见 wxGlobal.ts），
 * node/vitest 里无 wx 返回 undefined，调用方走静默兜底。
 * 存储格式契约：写侧必须 JSON.stringify 成字符串、读侧 parse 只认字符串；
 * wx setStorageSync 保类型存取，两侧不对称时记录会静默不可见（PtKing 2026-09 踩坑）。
 */

export interface TestRecord {
  testId: string
  /** ISO 时间串 */
  finishedAt: string
  result: TestResult
}

const STORAGE_KEY = 'ptking_test_records'
const MAX_RECORDS = 200

function readStorage(): unknown {
  try {
    return getWxGlobal()?.getStorageSync?.(STORAGE_KEY)
  } catch {
    return ''
  }
}

function writeStorage(payload: TestRecord[]): void {
  try {
    // 读侧 parseTestRecords 只认 JSON 字符串，写侧必须同样序列化（保类型存数组会导致读永远为空）
    getWxGlobal()?.setStorageSync?.(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 存储写入失败不阻断流程（记录是增强功能，不是主链路）
  }
}

/** 纯函数核心（可单测）：解析并校验存储内容，坏数据一律丢弃不抛错 */
export function parseTestRecords(raw: unknown): TestRecord[] {
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid = parsed.filter(
      (item): item is TestRecord =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as TestRecord).testId === 'string' &&
        typeof (item as TestRecord).finishedAt === 'string' &&
        typeof (item as TestRecord).result?.reportId === 'string',
    )
    return valid
  } catch {
    return []
  }
}

/** 纯函数核心（可单测）：追加一条记录并截断到上限，最新在前 */
export function appendRecord(records: TestRecord[], record: TestRecord, max = MAX_RECORDS): TestRecord[] {
  return [record, ...records].slice(0, max)
}

export function loadTestRecords(): TestRecord[] {
  return parseTestRecords(readStorage())
}

export function saveTestRecord(testId: string, result: TestResult): void {
  const record: TestRecord = { testId, finishedAt: new Date().toISOString(), result }
  writeStorage(appendRecord(loadTestRecords(), record))
}
