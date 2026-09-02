import { describe, expect, it } from 'vitest'
import { parseTarotHistory, listTarotHistory } from './tarotHistory'
import type { TarotReading } from './tarotReading'

const validReading = {
  question: '今天适合出门吗',
  spread: 'single',
  drawn: [{ id: 0, name: '愚者', reversed: false }],
  summary: 's',
  synthesis: 'syn',
  cardAnalyses: [],
  closing: 'c',
  next24Hours: 'n24',
  next7Days: 'n7',
  misreadings: [],
  createdAt: '2026-09-02T00:00:00.000Z',
} as unknown as TarotReading

describe('tarot history parsing', () => {
  it('returns empty for non-array storage (Taro empty-string storage included)', () => {
    expect(parseTarotHistory('')).toEqual([])
    expect(parseTarotHistory(null)).toEqual([])
    expect(parseTarotHistory({})).toEqual([])
  })

  it('keeps structurally valid readings and drops junk entries', () => {
    const raw = [validReading, { question: 'x' }, 'junk', null]
    expect(parseTarotHistory(raw)).toEqual([validReading])
  })

  it('listTarotHistory is safe without a wx global (node environment)', () => {
    expect(listTarotHistory()).toEqual([])
  })
})
