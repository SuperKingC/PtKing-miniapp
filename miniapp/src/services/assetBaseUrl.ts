/**
 * 静态资产根地址解析（正式 COS 版本目录）。
 * 构建时注入：TARO_ASSET_BASE_URL（正式域名+版本目录，M0 阶段有占位默认值）；
 * TARO_ASSET_DEV_BASE_URL 仅本地开发构建注入（本机 http-server 模拟 COS）。
 * 子路径由各功能自持：测试内容拼 {根}/tests/...，塔罗拼 {根}/tarot/...，本模块只管根地址。
 * 注意：这里不能静态 import @tarojs/taro（在 node/vitest 里导入即崩），平台读取走 wxGlobal 守卫。
 */
import { getWxGlobal } from './wxGlobal'

const prodBaseUrl = (
  typeof TARO_ASSET_BASE_URL === 'string' ? TARO_ASSET_BASE_URL : ''
).replace(/\/$/, '')
const devBaseUrl = (
  typeof TARO_ASSET_DEV_BASE_URL === 'string' ? TARO_ASSET_DEV_BASE_URL : ''
).replace(/\/$/, '')

/**
 * 纯函数核心（便于单测）：开发者工具模拟器且注入了本地模拟地址时走本机地址，
 * 真机与正式包（未注入 dev 地址）一律走正式域名。入参自动去尾部斜杠。
 */
export function resolveAssetBaseUrlForPlatform(
  platform: string,
  prodBaseUrlOverride = prodBaseUrl,
  devBaseUrlOverride = devBaseUrl,
): string {
  const prod = prodBaseUrlOverride.replace(/\/$/, '')
  const dev = devBaseUrlOverride.replace(/\/$/, '')
  if (platform === 'devtools' && dev) return dev
  return prod
}

function currentPlatform(): string {
  try {
    const wxApi = getWxGlobal()
    return wxApi?.getSystemInfoSync?.().platform ?? ''
  } catch {
    return ''
  }
}

let cachedBaseUrl: string | null = null

/** 运行时资产根地址：每次启动按宿主平台解析一次后缓存 */
export function resolveAssetBaseUrl(): string {
  if (cachedBaseUrl === null) {
    cachedBaseUrl = resolveAssetBaseUrlForPlatform(currentPlatform())
  }
  return cachedBaseUrl
}
