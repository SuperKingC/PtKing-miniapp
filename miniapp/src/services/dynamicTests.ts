import { applyDynamicTestDefinitions } from './testRegistry'
import { isValidTestDefinition } from './testRegistryMerge'
import { getWxGlobal } from './wxGlobal'

/**
 * COS 动态测试下发（M2）：从资产根 {根}/tests/registry-vN.json 拉取定义数组，
 * 合并进注册表（动态覆盖静态、追加新项）。任何失败都静默——静态兜底保证产品可用。
 * 上传新 registry 时升文件名版本号（资产缓存铁律），版本号在此同步。
 */
const REGISTRY_JSON_PATH = '/tests/registry-v1.json'
const REQUEST_TIMEOUT_MS = 8000

type RequestResponse = { statusCode?: number; data?: unknown }
type RequestOptions = {
  url: string
  timeout: number
  success?: (response: RequestResponse) => void
  fail?: () => void
}

export async function loadDynamicTests(baseUrl: string): Promise<void> {
  const trimmed = baseUrl.replace(/\/$/, '')
  if (!trimmed) return
  const request = getWxGlobal()?.request as ((options: RequestOptions) => void) | undefined
  if (!request) return

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
    const valid = list.filter(isValidTestDefinition)
    if (valid.length > 0) applyDynamicTestDefinitions(valid)
  } catch {
    // COS 不可达/结构不对：静默走静态兜底
  }
}
