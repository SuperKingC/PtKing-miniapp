import { describe, expect, it } from 'vitest'
import { mergeTestDefinitions } from './testRegistryMerge'
import type { TestDefinition } from '../domain/testEngine'

const base: TestDefinition = {
  id: 'static-a',
  title: '静态A',
  category: '人格',
  meta: { minutes: 1, resultLabel: 'x' },
  intro: ['i'],
  notice: 'n',
  questions: [{ text: 'q', options: [{ text: 'a' }, { text: 'b' }] }],
  scoring: { type: 'archetype', reports: ['r1'] },
  reports: { r1: { id: 'r1', title: 'R1', tagline: 't', summary: 's', detail: [] } },
}

function dynamic(id: string): TestDefinition {
  return { ...base, id, title: `动态${id}` }
}

describe('testRegistryMerge', () => {
  it('appends new dynamic definitions after the static order', () => {
    const merged = mergeTestDefinitions({ 'static-a': base }, ['static-a'], [dynamic('dyn-b')])
    expect(merged.order).toEqual(['static-a', 'dyn-b'])
    expect(merged.definitions['dyn-b'].title).toBe('动态dyn-b')
  })

  it('overrides same-id static definitions but keeps the static order position', () => {
    const override: TestDefinition = { ...base, title: '覆盖版' }
    const merged = mergeTestDefinitions({ 'static-a': base }, ['static-a'], [override])
    expect(merged.order).toEqual(['static-a'])
    expect(merged.definitions['static-a'].title).toBe('覆盖版')
  })

  it('drops structurally invalid dynamic entries', () => {
    const broken = [
      { ...dynamic('dyn-b'), questions: [] },
      null,
      'junk',
      dynamic('dyn-c'),
    ] as unknown as TestDefinition[]
    const merged = mergeTestDefinitions({ 'static-a': base }, ['static-a'], broken)
    expect(merged.order).toEqual(['static-a', 'dyn-c'])
  })
})
