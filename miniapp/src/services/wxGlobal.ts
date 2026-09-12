/**
 * 安全获取 wx 全局（真机 / 开发者工具 / node-vitest 三环境兼容）。
 * 关键事实：微信运行时把 wx 注入到每个模块的闭包作用域，而不一定挂在 globalThis 上
 * （真机尤其如此）——所以必须先用 typeof 探测裸标识符，globalThis.wx 只作兜底。
 * node/vitest 里两者都不存在，返回 undefined，调用方走各自的静默兜底路径。
 */
/** 只覆盖本地资源缓存用到的文件系统能力。 */
export interface WxFileSystemManager {
  /** 把临时文件持久化到小程序本地存储；success 回 savedFilePath。 */
  saveFile?: (options: {
    tempFilePath: string
    filePath?: string
    success?: (result: { savedFilePath?: string }) => void
    fail?: (error?: unknown) => void
  }) => void
  /** 同步探测文件是否存在；不存在时抛错。 */
  accessSync?: (path: string) => unknown
  unlinkSync?: (path: string) => unknown
}

export interface WxLike {
  getStorageSync?: (key: string) => unknown
  setStorageSync?: (key: string, value: unknown) => void
  removeStorageSync?: (key: string) => void
  getFileSystemManager?: () => WxFileSystemManager
  showModal?: (options: {
    title?: string
    content?: string
    confirmText?: string
    cancelText?: string
    success?: (result: { confirm?: boolean; cancel?: boolean }) => void
    fail?: () => void
  }) => void
  showShareMenu?: (options?: Record<string, unknown>) => void
  enableAlertBeforeUnload?: (options: { message: string }) => void
  disableAlertBeforeUnload?: () => void
  request?: (options: Record<string, unknown>) => void
  getSystemInfoSync?: () => { platform?: string; theme?: string }
  getWindowInfo?: () => { statusBarHeight?: number }
  getMenuButtonBoundingClientRect?: () => { top?: number; bottom?: number; height?: number }
  getRealtimeLogManager?: () => unknown
  onError?: (callback: (error: unknown) => void) => void
  onUnhandledRejection?: (callback: (res: { reason?: unknown }) => void) => void
  onPageNotFound?: (callback: (res: { path?: string }) => void) => void
  createRewardedVideoAd?: (options: { adUnitId: string }) => unknown
  setNavigationBarColor?: (options: { frontColor: string; backgroundColor: string }) => void
  setBackgroundColor?: (options: { backgroundColor: string }) => void
  createSelectorQuery?: () => {
    select: (selector: string) => {
      fields: (fields: Record<string, unknown>) => {
        exec: (callback: (result: Array<{ node?: unknown; width?: number; height?: number } | undefined>) => void) => void
      }
    }
  }
  canvasToTempFilePath?: (options: Record<string, unknown>) => void
  vibrateShort?: (options?: { type?: 'heavy' | 'medium' | 'light' }) => void
  vibrateLong?: () => void
  switchTab?: (options: { url: string; success?: () => void; fail?: (error?: unknown) => void }) => void
  downloadFile?: (options: {
    url: string
    success?: (result: { statusCode?: number; tempFilePath?: string }) => void
    fail?: (error?: unknown) => void
  }) => void
}

export function getWxGlobal(): WxLike | undefined {
  try {
    if (typeof wx !== 'undefined') return wx as unknown as WxLike
  } catch {
    // 裸标识符不可用时继续走 globalThis 兜底
  }
  return (globalThis as { wx?: WxLike }).wx
}
