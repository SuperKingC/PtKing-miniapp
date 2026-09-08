import { describe, expect, it } from 'vitest'
import { validateReportFeedback } from './reportFeedback'
describe('reportFeedback', () => { it('validates levels and reason limit', () => { expect(validateReportFeedback({ testId: 'x', finishedAt: 't', level: 'like', reason: '' })).toBe(true); expect(validateReportFeedback({ testId: 'x', finishedAt: 't', level: 'bad' as never, reason: '' })).toBe(false) }) })
