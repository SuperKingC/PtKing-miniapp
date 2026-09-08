import { getWxGlobal } from './wxGlobal'

export type FeedbackLevel = 'like' | 'partial' | 'unlike'
export interface ReportFeedback { testId: string; finishedAt: string; level: FeedbackLevel; reason: string; updatedAt: string }
const KEY = 'ptking_report_feedback'
const MAX = 200
const levels: FeedbackLevel[] = ['like', 'partial', 'unlike']
export function validateReportFeedback(value: Partial<ReportFeedback>): value is ReportFeedback {
  return typeof value.testId === 'string' && value.testId.length > 0 && typeof value.finishedAt === 'string' && value.finishedAt.length > 0 && levels.includes(value.level as FeedbackLevel) && typeof value.reason === 'string' && value.reason.length <= 200
}
export function saveReportFeedback(feedback: Omit<ReportFeedback, 'updatedAt'>): { ok: boolean; error?: string } {
  if (!validateReportFeedback(feedback)) return { ok: false, error: '反馈内容不完整或过长' }
  try {
    const wx = getWxGlobal(); const raw = wx?.getStorageSync?.(KEY); const list = typeof raw === 'string' && raw ? JSON.parse(raw) : []
    const next = [{ ...feedback, updatedAt: new Date().toISOString() }, ...list.filter((x: ReportFeedback) => !(x.testId === feedback.testId && x.finishedAt === feedback.finishedAt))].slice(0, MAX)
    wx?.setStorageSync?.(KEY, JSON.stringify(next)); return { ok: true }
  } catch { return { ok: false, error: '保存失败，请稍后重试' } }
}
export function listReportFeedback(): ReportFeedback[] { try { const raw = getWxGlobal()?.getStorageSync?.(KEY); return typeof raw === 'string' && raw ? JSON.parse(raw) : [] } catch { return [] } }
export function getReportFeedback(testId: string, finishedAt: string): ReportFeedback | null {
  return listReportFeedback().find((item) => item.testId === testId && item.finishedAt === finishedAt) ?? null
}
