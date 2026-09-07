import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { TestDefinition } from '../domain/testEngine'
import { miniappRoot } from '../config/testPaths'
import {
  clearTestDraft,
  getTestDraft,
  getTestContentSignature,
  isTestDraftValid,
  listActiveTestDrafts,
  offerResumeTestDraft,
  saveTestDraft,
  warnBeforeLeavingPlay,
  type TestDraft,
} from './testDrafts'

const definition: TestDefinition = {
  id: 'fixture',
  title: '草稿测试',
  category: '趣味',
  meta: { minutes: 1, resultLabel: '结果' },
  intro: [],
  notice: '',
  questions: [
    { text: '第一题', options: [{ text: 'A' }, { text: 'B' }] },
    { text: '第二题', options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }] },
  ],
  scoring: { type: 'band', max: 2, bands: [{ min: 0, max: 2, reportId: 'ok' }] },
  reports: { ok: { id: 'ok', title: '结果', tagline: '', summary: '', detail: [] } },
}

const draft: TestDraft = {
  testId: 'fixture',
  contentSignature: getTestContentSignature(definition),
  answers: [1, 2],
  questionIndex: 1,
  updatedAt: 1_000,
  expiresAt: 1_000 + 24 * 60 * 60 * 1000,
}

function mockWx(storage: Map<string, unknown>, showModal?: (options: Record<string, unknown>) => void) {
  ;(globalThis as { wx?: unknown }).wx = {
    getStorageSync: (key: string) => storage.get(key) ?? '',
    setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    removeStorageSync: (key: string) => storage.delete(key),
    showModal,
  }
}

describe('testDrafts', () => {
  it('round-trips a draft and rejects a changed question definition', () => {
    const storage = new Map<string, unknown>()
    mockWx(storage)
    try {
      saveTestDraft(definition, draft, 1_000)
      expect(getTestDraft(definition, 1_000)).toEqual(draft)
      const changed = { ...definition, questions: [{ ...definition.questions[0], text: '已变化' }, definition.questions[1]] }
      expect(getTestDraft(changed, 1_000)).toBeNull()
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })

  it('rejects expired drafts and invalid answer indexes', () => {
    expect(isTestDraftValid({ ...draft, expiresAt: 999 }, definition, 1_000)).toBe(false)
    expect(isTestDraftValid({ ...draft, answers: [0, 3] }, definition, 1_000)).toBe(false)
    expect(isTestDraftValid({ ...draft, answers: [0, undefined as unknown as number] }, definition, 1_000)).toBe(false)
  })

  it('does not throw when storage is unavailable or malformed', () => {
    ;(globalThis as { wx?: unknown }).wx = {
      getStorageSync: () => '{bad',
      setStorageSync: () => { throw new Error('quota') },
      removeStorageSync: () => { throw new Error('readonly') },
    }
    expect(getTestDraft(definition)).toBeNull()
    expect(() => saveTestDraft(definition, draft)).not.toThrow()
    expect(() => clearTestDraft(definition.id)).not.toThrow()
    delete (globalThis as { wx?: unknown }).wx
  })

  it('clears a completed draft', () => {
    const storage = new Map<string, unknown>()
    mockWx(storage)
    try {
      saveTestDraft(definition, draft)
      clearTestDraft(definition.id)
      expect(getTestDraft(definition)).toBeNull()
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })

  it('lists valid drafts newest first and skips expired ones', () => {
    const older = { ...definition, id: 'older', title: '旧草稿' }
    const storage = new Map<string, unknown>()
    mockWx(storage)
    try {
      saveTestDraft(older, { ...draft, testId: 'older', questionIndex: 0, answers: [0] }, 1_000)
      saveTestDraft(definition, draft, 2_000)
      const listed = listActiveTestDrafts([older, definition], 2_000)
      expect(listed.map((item) => item.definition.id)).toEqual(['fixture', 'older'])
      expect(listActiveTestDrafts([definition], 1_000 + 25 * 60 * 60 * 1000)).toEqual([])
    } finally {
      delete (globalThis as { wx?: unknown }).wx
    }
  })

  it('arms and disarms the leave warning without throwing', () => {
    const calls: string[] = []
    ;(globalThis as { wx?: unknown }).wx = {
      enableAlertBeforeUnload: () => { calls.push('on') },
      disableAlertBeforeUnload: () => { calls.push('off') },
    }
    const dispose = warnBeforeLeavingPlay()
    dispose()
    expect(calls).toEqual(['on', 'off'])
    delete (globalThis as { wx?: unknown }).wx
    expect(() => warnBeforeLeavingPlay()()).not.toThrow()
  })

  it('lets the user continue or restart a draft', async () => {
    const storage = new Map<string, unknown>()
    mockWx(storage, (options) => {
      const success = options.success as ((result: { confirm: boolean }) => void) | undefined
      success?.({ confirm: true })
    })
    await expect(offerResumeTestDraft(draft)).resolves.toBe(true)

    mockWx(storage, (options) => {
      const success = options.success as ((result: { confirm: boolean }) => void) | undefined
      success?.({ confirm: false })
    })
    await expect(offerResumeTestDraft(draft)).resolves.toBe(false)
    delete (globalThis as { wx?: unknown }).wx
    await expect(offerResumeTestDraft(draft)).resolves.toBe(true)
  })

  it('restores drafts through the play page service, not raw storage calls', () => {
    const play = readFileSync(resolve(miniappRoot(), 'src/pages/test-play/index.tsx'), 'utf8')
    expect(play).toContain('getTestDraft')
    expect(play).toContain('saveTestDraft')
    expect(play).toContain('clearTestDraft')
    expect(play).toContain('offerResumeTestDraft')
    expect(play).toContain('warnBeforeLeavingPlay')
    expect(play).toContain('((qIndex + 1) / total) * 100')
    expect(play).toContain("trackEvent('test_answer'")
    expect(play).not.toMatch(/getStorageSync|setStorageSync|showModal/)
  })
})
