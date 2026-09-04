/**
 * 监控与埋点（无后端阶段的线上观测方案）：
 * - 实时日志 wx.getRealtimeLogManager：小程序后台「开发-运维中心-实时日志」按时间/页面检索，
 *   零配置，是当前唯一的线上观测通道（错误搜「[err]」，漏斗事件搜「[evt]」）。
 * - 全局错误捕获 wx.onError / onUnhandledRejection / onPageNotFound，App 启动时 installGlobalErrorHandlers 注册一次。
 * - 关键漏斗事件 trackEvent：test_detail_view / test_start / test_complete / report_view / report_unlock，
 *   上线后据此统计完测率、解锁率与流失点。
 * wx 访问统一走 getWxGlobal：node/vitest 无 wx 时全部静默，绝不影响主流程。
 */
import { getWxGlobal } from './wxGlobal'

interface RealtimeLoggerLike {
  info?: (...args: unknown[]) => void
  warn?: (...args: unknown[]) => void
  error?: (...args: unknown[]) => void
}

let cachedLogger: RealtimeLoggerLike | null | undefined

function getLogger(): RealtimeLoggerLike | null {
  if (cachedLogger !== undefined) return cachedLogger
  try {
    cachedLogger = (getWxGlobal()?.getRealtimeLogManager?.() as RealtimeLoggerLike | undefined) ?? null
  } catch {
    cachedLogger = null
  }
  return cachedLogger
}

/** 纯函数核心（可单测）：把错误对象规整成限长、可检索的一段文本 */
export function formatErrorDetail(err: unknown, maxLen = 900): string {
  const detail = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)
  return detail.slice(0, maxLen)
}

/** 关键漏斗/行为事件：实时日志 info 通道 + 开发者工具 console 对照输出 */
export function trackEvent(event: string, data: Record<string, unknown> = {}): void {
  try {
    getLogger()?.info?.('[evt]', event, JSON.stringify(data))
  } catch {
    // 日志失败不影响主流程
  }
  try {
    console.info('[track]', event, data)
  } catch {
    // 忽略
  }
}

/** 错误上报：实时日志 error 通道 */
export function captureError(err: unknown, context: string): void {
  try {
    getLogger()?.error?.('[err]', context, formatErrorDetail(err))
  } catch {
    // 忽略
  }
  try {
    console.error('[capture]', context, err)
  } catch {
    // 忽略
  }
}

/** App 启动时注册一次：脚本错误 / 未处理的 Promise 拒绝 / 路由不存在 */
export function installGlobalErrorHandlers(): void {
  const wxLike = getWxGlobal()
  try {
    wxLike?.onError?.((error: unknown) => captureError(error, 'wx_on_error'))
  } catch {
    // 忽略
  }
  try {
    wxLike?.onUnhandledRejection?.((res: { reason?: unknown }) => captureError(res?.reason, 'unhandled_rejection'))
  } catch {
    // 忽略
  }
  try {
    wxLike?.onPageNotFound?.((res: { path?: string }) => {
      trackEvent('page_not_found', { path: res?.path ?? '' })
    })
  } catch {
    // 忽略
  }
}
