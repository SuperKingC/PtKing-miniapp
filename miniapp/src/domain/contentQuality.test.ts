import { describe, expect, it } from 'vitest'
import { listTestDefinitions } from '../services/testRegistry'
import { collectCopyIssues } from './contentQuality'

describe('全库文案质量', () => {
  it('上架测试没有定论句、重复题、双重否定和禁止措辞', () => {
    const issues = listTestDefinitions().flatMap((definition) =>
      collectCopyIssues(definition).map((issue) => `${definition.id}: ${issue}`),
    )
    expect(issues).toEqual([])
  })
})
