import type { TestDefinition } from '../domain/testEngine'
import { getWxGlobal } from './wxGlobal'

/**
 * 答题草稿：按测试 id 落本地 storage，离开后再进可续答。
 * 内容签名绑定当前题干/选项；题库热更后旧草稿失效。存储异常不阻断答题。
 */
export const TEST_DRAFT_TTL_MS = 24 * 60 * 60 * 1000
const STORAGE_PREFIX = 'ptking_test_draft:'

export interface TestDraft {
  testId: string
  contentSignature: string
  answers: number[]
  questionIndex: number
  updatedAt: number
  expiresAt: number
}

export function getTestContentSignature(definition: TestDefinition): string {
  return JSON.stringify(
    definition.questions.map((question) => ({
      text: question.text,
      options: question.options.map((option) => option.text),
    })),
  )
}

function storageKey(testId: string): string {
  return `${STORAGE_PREFIX}${testId}`
}

export function isTestDraftValid(
  draft: TestDraft,
  definition: TestDefinition,
  now = Date.now(),
): boolean {
  if (draft.testId !== definition.id) return false
  if (draft.contentSignature !== getTestContentSignature(definition)) return false
  if (!Number.isFinite(draft.expiresAt) || draft.expiresAt < now) return false
  if (!Number.isInteger(draft.questionIndex)) return false
  if (draft.questionIndex < 0 || draft.questionIndex >= definition.questions.length) return false
  if (!Array.isArray(draft.answers) || draft.answers.length > definition.questions.length) return false
  if (draft.questionIndex > draft.answers.length) return false
  return draft.answers.every((answer, index) => {
    const question = definition.questions[index]
    return Number.isInteger(answer) && answer >= 0 && answer < question.options.length
  })
}

function parseDraft(raw: unknown): TestDraft | null {
  if (typeof raw !== 'string' || !raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const draft = parsed as TestDraft
    if (
      typeof draft.testId !== 'string'
      || typeof draft.contentSignature !== 'string'
      || !Array.isArray(draft.answers)
      || !Number.isInteger(draft.questionIndex)
      || typeof draft.updatedAt !== 'number'
      || typeof draft.expiresAt !== 'number'
    ) {
      return null
    }
    return draft
  } catch {
    return null
  }
}

export function getTestDraft(definition: TestDefinition, now = Date.now()): TestDraft | null {
  try {
    const draft = parseDraft(getWxGlobal()?.getStorageSync?.(storageKey(definition.id)))
    if (!draft || !isTestDraftValid(draft, definition, now)) {
      if (draft) clearTestDraft(definition.id)
      return null
    }
    return draft
  } catch {
    return null
  }
}

export function saveTestDraft(
  definition: TestDefinition,
  draft: TestDraft,
  now = Date.now(),
): void {
  try {
    const next: TestDraft = {
      ...draft,
      testId: definition.id,
      contentSignature: getTestContentSignature(definition),
      updatedAt: now,
      expiresAt: now + TEST_DRAFT_TTL_MS,
    }
    if (!isTestDraftValid(next, definition, now)) return
    getWxGlobal()?.setStorageSync?.(storageKey(definition.id), JSON.stringify(next))
  } catch {
    // 草稿是增强能力，写入失败不阻断答题
  }
}

export function listActiveTestDrafts(
  definitions: TestDefinition[],
  now = Date.now(),
): Array<{ definition: TestDefinition; draft: TestDraft }> {
  return definitions
    .map((definition) => {
      const draft = getTestDraft(definition, now)
      return draft ? { definition, draft } : null
    })
    .filter((item): item is { definition: TestDefinition; draft: TestDraft } => item !== null)
    .sort((left, right) => right.draft.updatedAt - left.draft.updatedAt)
}

export function clearTestDraft(testId: string): void {
  try {
    getWxGlobal()?.removeStorageSync?.(storageKey(testId))
  } catch {
    // 清理失败不阻断主流程
  }
}

/** 平台弹窗：继续答题 / 重新开始。无法弹窗时默认续答，避免静默丢掉草稿。 */
export function offerResumeTestDraft(draft: TestDraft): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = getWxGlobal()?.showModal
    if (!modal) {
      resolve(true)
      return
    }
    try {
      modal({
        title: '发现未完成的测试',
        content: `上次答到第 ${draft.questionIndex + 1} 题，是否继续？`,
        confirmText: '继续答题',
        cancelText: '重新开始',
        success: (result) => resolve(result.confirm === true),
        fail: () => resolve(false),
      })
    } catch {
      resolve(false)
    }
  })
}
