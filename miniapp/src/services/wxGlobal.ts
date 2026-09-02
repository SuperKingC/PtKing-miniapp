/**
 * 安全获取 wx 全局（真机 / 开发者工具 / node-vitest 三环境兼容）。
 * 关键事实：微信运行时把 wx 注入到每个模块的闭包作用域，而不一定挂在 globalThis 上
 * （真机尤其如此）——所以必须先用 typeof 探测裸标识符，globalThis.wx 只作兜底。
 * node/vitest 里两者都不存在，返回 undefined，调用方走各自的静默兜底路径。
 */
export interface WxLike {
  getStorageSync?: (key: string) => unknown
  setStorageSync?: (key: string, value: unknown) => void
  showShareMenu?: (options?: Record<string, unknown>) => void
  request?: (options: Record<string, unknown>) => void
  getSystemInfoSync?: () => { platform?: string }
}

export function getWxGlobal(): WxLike | undefined {
  try {
    if (typeof wx !== 'undefined') return wx as unknown as WxLike
  } catch {
    // 裸标识符不可用时继续走 globalThis 兜底
  }
  return (globalThis as { wx?: WxLike }).wx
}
