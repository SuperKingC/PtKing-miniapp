import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { miniappRoot } from '../config/testPaths'

const requestMock = vi.fn()
const definition = {
  id: 'dyn',
  title: '动态测试',
  category: '趣味' as const,
  meta: { minutes: 1, resultLabel: 'x' },
  intro: ['i'],
  notice: 'n',
  questions: [{ text: 'q', options: [{ text: 'a' }, { text: 'b' }] }],
  scoring: { type: 'archetype' as const, reports: ['r1'] },
  reports: { r1: { id: 'r1', title: 'R1', tagline: 't', summary: 's', detail: [] } },
}

beforeEach(() => {
  vi.resetModules()
  requestMock.mockReset()
  vi.stubGlobal('wx', { request: requestMock })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('dynamicTests loader', () => {
  it('silently does nothing without a wx global', async () => {
    vi.stubGlobal('wx', undefined)
    const { loadDynamicTests } = await import('./dynamicTests')
    await expect(loadDynamicTests('https://cos.example.com')).resolves.toBeUndefined()
  })

  it('skips requests without an asset root', async () => {
    const { loadDynamicTests } = await import('./dynamicTests')
    await loadDynamicTests('')
    expect(requestMock).not.toHaveBeenCalled()
  })

  it('fetches from the versioned asset root with a finite timeout and applies valid definitions', async () => {
    requestMock.mockImplementation(({ url, timeout, success }) => {
      expect(url).toBe('https://cos.example.com/assets/v2/tests/registry-v1.json')
      expect(timeout).toBeGreaterThan(0)
      expect(timeout).toBeLessThanOrEqual(10000)
      success({ statusCode: 200, data: { tests: [null, {}, definition] } })
    })
    const { loadDynamicTests } = await import('./dynamicTests')
    const { getTestDefinition } = await import('./testRegistry')
    await loadDynamicTests('https://cos.example.com/assets/v2/')
    expect(getTestDefinition('dyn')?.title).toBe('动态测试')
  })

  it.each([404, 500, undefined])('ignores unsuccessful or missing HTTP status %s', async (statusCode) => {
    requestMock.mockImplementation(({ success }) => success({ statusCode, data: { tests: [definition] } }))
    const { loadDynamicTests } = await import('./dynamicTests')
    const { getTestDefinition } = await import('./testRegistry')
    await loadDynamicTests('https://cos.example.com')
    expect(getTestDefinition('dyn')).toBeNull()
    expect(getTestDefinition('mbti')).not.toBeNull()
  })

  it.each([null, {}, { tests: 'invalid' }, { tests: [null, {}] }])('keeps static fallback for malformed payload %j', async (data) => {
    requestMock.mockImplementation(({ success }) => success({ statusCode: 200, data }))
    const { loadDynamicTests } = await import('./dynamicTests')
    const { getTestDefinition } = await import('./testRegistry')
    await expect(loadDynamicTests('https://cos.example.com')).resolves.toBeUndefined()
    expect(getTestDefinition('mbti')).not.toBeNull()
    expect(getTestDefinition('dyn')).toBeNull()
  })

  it('keeps static fallback usable when the request fails', async () => {
    requestMock.mockImplementation(({ fail }) => fail())
    const { loadDynamicTests } = await import('./dynamicTests')
    const { getTestDefinition } = await import('./testRegistry')
    await expect(loadDynamicTests('https://cos.example.com')).resolves.toBeUndefined()
    expect(getTestDefinition('mbti')).not.toBeNull()
  })

  it('finishes stalled requests and ignores a late success', async () => {
    vi.useFakeTimers()
    let lateSuccess: (result: unknown) => void = () => {}
    requestMock.mockImplementation(({ success }) => { lateSuccess = success })
    const { loadDynamicTests } = await import('./dynamicTests')
    const { getTestDefinition } = await import('./testRegistry')
    const finished = vi.fn()
    const loading = loadDynamicTests('https://cos.example.com').then(finished)
    await vi.advanceTimersByTimeAsync(10000)
    expect(finished).toHaveBeenCalledOnce()
    await loading
    lateSuccess({ statusCode: 200, data: { tests: [definition] } })
    expect(getTestDefinition('dyn')).toBeNull()
    expect(getTestDefinition('mbti')).not.toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('dynamic registry subscriptions', () => {
  it('notifies after merging, supports overrides and unsubscribes on cleanup', async () => {
    const registry = await import('./testRegistry')
    const changed = vi.fn(() => expect(registry.getTestDefinition('dyn')).not.toBeNull())
    const unsubscribe = registry.subscribeTestRegistry(changed)
    registry.applyDynamicTestDefinitions([definition])
    expect(changed).toHaveBeenCalledOnce()
    expect(registry.listTestDefinitions().at(-1)?.id).toBe('dyn')
    registry.applyDynamicTestDefinitions([{ ...definition, title: '已更新' }])
    expect(changed).toHaveBeenCalledTimes(2)
    expect(registry.getTestDefinition('dyn')?.title).toBe('已更新')
    unsubscribe()
    registry.applyDynamicTestDefinitions([definition])
    expect(changed).toHaveBeenCalledTimes(2)
  })
})

describe('dynamic content wiring', () => {
  it('starts loading once from the shared platform-aware asset root', () => {
    const app = readFileSync(resolve(miniappRoot(), 'src/app.tsx'), 'utf8')
    expect(app).toContain("from './services/assetBaseUrl'")
    expect(app).toMatch(/useEffect\([\s\S]*void loadDynamicTests\(resolveAssetBaseUrl\(\)\)[\s\S]*\}, \[\]\)/)
  })

  it('subscribes the home page, refreshes after subscribing and returns cleanup', () => {
    const page = readFileSync(resolve(miniappRoot(), 'src/pages/test/index.tsx'), 'utf8')
    expect(page).toContain('useState(listTestDefinitions)')
    expect(page).toMatch(/useEffect\(\(\) => \{[\s\S]*subscribeTestRegistry\(refresh\)[\s\S]*refresh\(\)[\s\S]*return unsubscribe[\s\S]*\}, \[\]\)/)
    expect(page).toContain('setDefinitions(listTestDefinitions())')
  })
})
