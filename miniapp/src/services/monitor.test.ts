import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WxLike } from './wxGlobal'

/**
 * monitor 测试：模块级缓存（cachedLogger）会跨用例残留，
 * 每个用例 resetModules + 重新 import 得到干净实例；wx 用 globalThis 注入，
 * 清理放 afterEach（测试体执行期间必须保持 wx 可用）。
 */
function loadMonitorWithWx(wxMock: Partial<WxLike> | undefined) {
  vi.resetModules()
  if (wxMock === undefined) {
    delete (globalThis as { wx?: unknown }).wx
  } else {
    ;(globalThis as { wx?: unknown }).wx = wxMock
  }
  return import('./monitor')
}

afterEach(() => {
  delete (globalThis as { wx?: unknown }).wx
})

function makeLoggerSpy() {
  const calls = { info: [] as unknown[][], error: [] as unknown[][] }
  return {
    calls,
    logger: {
      info: (...args: unknown[]) => {
        calls.info.push(args)
      },
      error: (...args: unknown[]) => {
        calls.error.push(args)
      },
    },
  }
}

describe('formatErrorDetail', () => {
  it('extracts message + stack from an Error', async () => {
    const monitor = await loadMonitorWithWx(undefined)
    const err = new Error('boom')
    const detail = monitor.formatErrorDetail(err)
    expect(detail).toContain('boom')
  })

  it('stringifies non-Error values and truncates to maxLen', async () => {
    const monitor = await loadMonitorWithWx(undefined)
    expect(monitor.formatErrorDetail('plain failure')).toBe('plain failure')
    expect(monitor.formatErrorDetail('x'.repeat(50), 10)).toHaveLength(10)
  })
})

describe('trackEvent / captureError', () => {
  it('routes events to the realtime logger info channel with a searchable prefix', async () => {
    const spy = makeLoggerSpy()
    const monitor = await loadMonitorWithWx({ getRealtimeLogManager: () => spy.logger })
    monitor.trackEvent('test_complete', { testId: 'mbti' })
    expect(spy.calls.info[0][0]).toBe('[evt]')
    expect(spy.calls.info[0][1]).toBe('test_complete')
    expect(spy.calls.info[0][2]).toBe(JSON.stringify({ testId: 'mbti' }))
  })

  it('routes errors to the realtime logger error channel with context', async () => {
    const spy = makeLoggerSpy()
    const monitor = await loadMonitorWithWx({ getRealtimeLogManager: () => spy.logger })
    monitor.captureError(new Error('engine broke'), 'score_test_failed')
    expect(spy.calls.error[0][0]).toBe('[err]')
    expect(spy.calls.error[0][1]).toBe('score_test_failed')
    expect(String(spy.calls.error[0][2])).toContain('engine broke')
  })

  it('stays silent without wx (node/vitest safety)', async () => {
    const monitor = await loadMonitorWithWx(undefined)
    expect(() => {
      monitor.trackEvent('evt', { a: 1 })
      monitor.captureError(new Error('x'), 'ctx')
    }).not.toThrow()
  })
})

describe('installGlobalErrorHandlers', () => {
  it('captures script errors and unhandled rejections via the registered handlers', async () => {
    const spy = makeLoggerSpy()
    const registered: { onError?: (error: unknown) => void; onRejection?: (res: { reason?: unknown }) => void } = {}
    const monitor = await loadMonitorWithWx({
      getRealtimeLogManager: () => spy.logger,
      onError: (cb) => {
        registered.onError = cb
      },
      onUnhandledRejection: (cb) => {
        registered.onRejection = cb
      },
    })
    monitor.installGlobalErrorHandlers()
    expect(registered.onError).toBeInstanceOf(Function)
    expect(registered.onRejection).toBeInstanceOf(Function)
    registered.onRejection?.({ reason: new Error('async boom') })
    const lastError = spy.calls.error.at(-1)
    expect(lastError?.[1]).toBe('unhandled_rejection')
    expect(String(lastError?.[2])).toContain('async boom')
  })

  it('stays silent when wx lacks the handler APIs', async () => {
    const monitor = await loadMonitorWithWx({})
    expect(() => monitor.installGlobalErrorHandlers()).not.toThrow()
  })
})
