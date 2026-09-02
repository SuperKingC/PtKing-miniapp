import type { TestResult } from '../domain/testEngine'

/**
 * 测试记录存储（M1 本地 storage 版；M2 迁服务端，关联 openid 跨设备同步）。
 * 注意 Taro getStorageSync 无值时返回空串而非 undefined（Pet10 698990d 教训），
 * 读取必须加 typeof 守卫。模块用守卫式 wx 全局读写，node/vitest 里可安全 import。
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
    const wxApi = (globalThis as { wx?: { getStorageSync?: (key: string) => unknown } }).wx
    return wxApi?.getStorageSync?.(STORAGE_KEY)
  } catch {
    return ''
  }
}

function writeStorage(payload: TestRecord[]): void {
  try {
    const wxApi = (globalThis as { wx?: { setStorageSync?: (key: string, value: unknown) => void } }).wx
    wxApi?.setStorageSync?.(STORAGE_KEY, payload)
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
