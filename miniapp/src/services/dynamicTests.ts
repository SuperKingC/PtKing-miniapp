import { isUsableAssetBaseUrl } from './assetBaseUrl'
import { rememberAssetRev } from './assetRev'
import { applyDynamicTestDefinitions } from './testRegistry'
import { isValidTestDefinition } from './testRegistryMerge'
import { getWxGlobal } from './wxGlobal'

/**
 * COS 动态测试下发（M2）：从资产根 {根}/tests/registry-vN.json 拉取定义数组，
 * 合并进注册表（动态覆盖静态、追加新项）。任何失败都静默——静态兜底保证产品可用。
 * 题库热更覆盖同名 registry-v1.json（短缓存）。换塔罗图走 JSON 里的 assetRev，不必升图片文件名。
 */
// ?v=2 破缓存：registry 曾被按版本资产策略以 immutable(一年) 头上传过，已访问过的客户端
// HTTP 缓存不会再请求同 URL（2026-09-15 实测：清编译缓存无效，改查询串才破）。服务端头已改回
// 60s 短缓存（publish-assets 现单独按 short 补传 registry），此后内容推送靠短缓存传播，无需再升 v。
const REGISTRY_JSON_PATH = '/tests/registry-v1.json?v=2'
const REQUEST_TIMEOUT_MS = 8000
let loadGeneration = 0

type RequestResponse = { statusCode?: number; data?: unknown }
type RequestOptions = {
  url: string
  timeout: number
  success?: (response: RequestResponse) => void
  fail?: () => void
}

export async function loadDynamicTests(baseUrl: string): Promise<void> {
  const trimmed = baseUrl.replace(/\/$/, '')
  if (!isUsableAssetBaseUrl(trimmed)) return
  const request = getWxGlobal()?.request as ((options: RequestOptions) => void) | undefined
  if (!request) return

  const generation = ++loadGeneration
  try {
    const data = await new Promise<unknown>((resolve, reject) => {
      let settled = false
      const finish = (callback: () => void) => {
        if (settled) return
        settled = true
        clearTimeout(timeoutId)
        callback()
      }
      const timeoutId = setTimeout(() => finish(reject), REQUEST_TIMEOUT_MS)
      request({
        url: `${trimmed}${REGISTRY_JSON_PATH}`,
        timeout: REQUEST_TIMEOUT_MS,
        success: (res) => {
          if (res.statusCode !== 200) {
            finish(reject)
            return
          }
          finish(() => resolve(res.data))
        },
        fail: () => finish(reject),
      })
    })
    const list = Array.isArray((data as { tests?: unknown[] } | null)?.tests)
      ? (data as { tests: unknown[] }).tests
      : []
    if (generation !== loadGeneration) return
    rememberAssetRev((data as { assetRev?: unknown } | null)?.assetRev)
    const valid = list.filter(isValidTestDefinition)
    if (valid.length > 0) applyDynamicTestDefinitions(valid)
  } catch {
    // COS 不可达/结构不对：静默走静态兜底
  }
}
