import type { TestResult } from '../domain/testEngine'
import { isRewardedAdConfigured } from './rewardedAd'
import { getWxGlobal } from './wxGlobal'

/**
 * 测试记录存储（M1 本地 storage 版；M2 迁服务端，关联 openid 跨设备同步）。
 * 注意 Taro getStorageSync 无值时返回空串而非 undefined（Pet10 698990d 教训），
 * 读取必须加 typeof 守卫。wx 访问统一走 getWxGlobal（真机闭包注入兼容，见 wxGlobal.ts），
 * node/vitest 里无 wx 返回 undefined，调用方走静默兜底。
 * 存储格式契约：写侧必须 JSON.stringify 成字符串、读侧 parse 只认字符串；
 * wx setStorageSync 保类型存取，两侧不对称时记录会静默不可见（PtKing 2026-09 踩坑）。
 * locked/testTitle/resultTitle 为 2026-09 扩展字段：旧记录缺省时按已解锁、走定义标题兜底。
 */

export interface TestRecord {
  testId: string
  /** ISO 时间串 */
  finishedAt: string
  result: TestResult
  /** 报告解锁状态：新完成的记录 locked=true，看完激励视频后置 false；undefined 视为已解锁（旧记录） */
  locked?: boolean
  /** 落库时的测试标题快照：测试下架后记录页仍可展示 */
  testTitle?: string
  /** 落库时的报告标题快照 */
  resultTitle?: string
}

/** 记录上限：超出后丢弃最旧（记录页达上限时展示提示条） */
export const TEST_RECORDS_CAP = 200

const STORAGE_KEY = 'ptking_test_records'
const MAX_RECORDS = TEST_RECORDS_CAP

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
  return normalizeRecordLocks(parseTestRecords(readStorage()), isRewardedAdConfigured())
}

/** 纯函数核心（可单测）：广告位未配置时，历史遗留的 locked 一律视为已解锁。
 * 兼容「先落锁、后未配广告位」的旧记录（含广告位配置前落库的调试数据），
 * 读取侧统一归一，报告页/记录页不需要各自兜底。 */
export function normalizeRecordLocks(records: TestRecord[], adConfigured: boolean): TestRecord[] {
  if (adConfigured) return records
  return records.map((item) => (item.locked === true ? { ...item, locked: false } : item))
}

export interface SaveRecordMeta {
  /** 报告是否锁定（看激励视频解锁），新完成的记录传 true */
  locked?: boolean
  /** 测试标题快照 */
  testTitle?: string
  /** 报告标题快照 */
  resultTitle?: string
}

export function saveTestRecord(testId: string, result: TestResult, meta: SaveRecordMeta = {}): void {
  const record: TestRecord = { testId, finishedAt: new Date().toISOString(), result, ...meta }
  writeStorage(appendRecord(loadTestRecords(), record))
}

/** 纯函数核心（可单测）：按 testId+finishedAt 精确把一条记录标记为已解锁 */
export function markRecordUnlocked(records: TestRecord[], testId: string, finishedAt: string): TestRecord[] {
  return records.map((item) =>
    item.testId === testId && item.finishedAt === finishedAt ? { ...item, locked: false } : item,
  )
}

export function unlockRecord(testId: string, finishedAt: string): void {
  writeStorage(markRecordUnlocked(loadTestRecords(), testId, finishedAt))
}

export function clearTestRecords(): void {
  try {
    getWxGlobal()?.removeStorageSync?.(STORAGE_KEY)
  } catch {
    // 清理失败不阻断
  }
}

export interface HistoryRow {
  /** 第几次完成（最新一次为总次数） */
  attempt: number
  record: TestRecord
  /** 与上一次的 bandScore 差值（任一侧无分数为 null；正数=比上次高） */
  delta: number | null
}

/** 纯函数核心（可单测）：历史对比行（入参最新在前，最多取 maxRows 条） */
export function buildHistoryRows(history: TestRecord[], maxRows = 4): HistoryRow[] {
  const rows: HistoryRow[] = []
  for (let index = 0; index < Math.min(history.length, maxRows); index += 1) {
    const record = history[index]
    const older = history[index + 1]
    const currentScore = typeof record.result.bandScore === 'number' ? record.result.bandScore : null
    const olderScore = older && typeof older.result.bandScore === 'number' ? older.result.bandScore : null
    rows.push({
      attempt: history.length - index,
      record,
      delta: currentScore !== null && olderScore !== null ? currentScore - olderScore : null,
    })
  }
  return rows
}
