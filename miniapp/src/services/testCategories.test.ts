import { describe, expect, it } from 'vitest'
import { filterByCategory, TEST_CATEGORIES } from './testCategories'
import { listTestDefinitions } from './testRegistry'

describe('test categories', () => {
  it('exposes the five filter chips in display order', () => {
    expect(TEST_CATEGORIES.map((category) => category.key)).toEqual([
      'all',
      '人格',
      '情感',
      '职场',
      '趣味',
    ])
  })

  it('returns the full list unchanged for the "all" key', () => {
    const definitions = listTestDefinitions()
    expect(filterByCategory(definitions, 'all')).toBe(definitions)
  })

  it('filters strictly by category', () => {
    const definitions = listTestDefinitions()
    const work = filterByCategory(definitions, '职场')
    expect(work.length).toBeGreaterThan(0)
    for (const item of work) {
      expect(item.category).toBe('职场')
    }
  })

  it('never returns an empty filter result for any registered category', () => {
    const definitions = listTestDefinitions()
    for (const category of TEST_CATEGORIES) {
      expect(filterByCategory(definitions, category.key).length).toBeGreaterThan(0)
    }
  })
})
