import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(require('node:path').resolve(__dirname, 'index.tsx'), 'utf8')
describe('bright records layout', () => {
  it('uses real counts, a standalone book and date groups', () => {
    expect(source).toContain('我的记录')
    expect(source).toContain('records-book-v4.png')
    expect(source).toContain('已探索 ')
    expect(source).toContain('{records.length}')
    expect(source).toContain('records-page__date-group')
    expect(source).toContain('dateGroupLabel(record.finishedAt)')
  })
  it('keeps record deletion, report navigation and draft recovery', () => {
    expect(source).toContain('deleteTestRecord(record.testId, record.finishedAt)')
    expect(source).toContain('encodeURIComponent(record.finishedAt)')
    expect(source).toContain('resumeBanner')
    expect(source).toContain('filterRecords(records, category, categories)')
  })
})
