import { describe, expect, it, vi } from 'vitest'

const requestMock = vi.fn()

function mockWx(impl: typeof requestMock) {
  ;(globalThis as { wx?: unknown }).wx = { request: impl }
}

function unmockWx() {
  delete (globalThis as { wx?: unknown }).wx
}

describe('dynamicTests loader', () => {
  it('silently does nothing without a wx global (node/vitest safety)', async () => {
    unmockWx()
    const { loadDynamicTests } = await import('./dynamicTests')
    await expect(loadDynamicTests('https://cos.example.com')).resolves.toBeUndefined()
  })

  it('fetches the registry json and applies valid definitions', async () => {
    const definition = {
      id: 'dyn',
      title: '动态测试',
      category: '趣味',
      meta: { minutes: 1, resultLabel: 'x' },
      intro: ['i'],
      notice: 'n',
      questions: [{ text: 'q', options: [{ text: 'a' }, { text: 'b' }] }],
      scoring: { type: 'archetype', reports: ['r1'] },
      reports: { r1: { id: 'r1', title: 'R1', tagline: 't', summary: 's', detail: [] } },
    }
    requestMock.mockImplementation(({ url, success }) => {
      expect(url).toBe('https://cos.example.com/tests/registry-v1.json')
      success?.({ data: { tests: [definition] } })
    })
    mockWx(requestMock)

    const { loadDynamicTests } = await import('./dynamicTests')
    const { getTestDefinition } = await import('./testRegistry')
    await loadDynamicTests('https://cos.example.com')
    expect(getTestDefinition('dyn')?.title).toBe('动态测试')
    unmockWx()
  })

  it('keeps static fallback usable when the request fails', async () => {
    requestMock.mockImplementation(({ fail }) => fail?.())
    mockWx(requestMock)

    const { loadDynamicTests } = await import('./dynamicTests')
    const { getTestDefinition } = await import('./testRegistry')
    await loadDynamicTests('https://cos.example.com')
    expect(getTestDefinition('mbti')).not.toBeNull()
    unmockWx()
  })
})
