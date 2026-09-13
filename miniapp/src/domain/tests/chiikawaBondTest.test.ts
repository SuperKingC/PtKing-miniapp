import { describe, expect, it } from 'vitest'
import { scoreTest } from '../testEngine'
import { CHIIKAWA_BOND_TEST } from './chiikawaBondTest'

const ROLES = ['chiikawa', 'hachiware', 'usagi', 'rakko', 'kurimanju', 'momonga', 'kaiman', 'shisa'] as const
type Role = (typeof ROLES)[number]

function countRoles(questionIndexes: number[] = CHIIKAWA_BOND_TEST.questions.map((_, index) => index)) {
  const counts = new Map<Role, number>(ROLES.map((role) => [role, 0]))
  questionIndexes.forEach((questionIndex) => {
    CHIIKAWA_BOND_TEST.questions[questionIndex].options.forEach((option) => {
      counts.set(option.reportId as Role, (counts.get(option.reportId as Role) ?? 0) + 1)
    })
  })
  return counts
}

describe('Chiikawa bond test definition', () => {
  it('uses 32 questions with four short, unique options each', () => {
    expect(CHIIKAWA_BOND_TEST.questions).toHaveLength(32)
    expect(CHIIKAWA_BOND_TEST.intro.join('')).toContain('32')
    expect(CHIIKAWA_BOND_TEST.intro.join('')).not.toContain('24')
    for (const question of CHIIKAWA_BOND_TEST.questions) {
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options.map((option) => option.text)).size).toBe(4)
      for (const option of question.options) {
        expect(option.text.length).toBeLessThanOrEqual(42)
        expect(option.text).not.toMatch(/吉伊|小八|乌萨奇|海獭|栗子馒头|飞鼠|铠甲先生|狮萨/)
      }
    }
    expect(new Set(CHIIKAWA_BOND_TEST.questions.map((question) => question.text)).size).toBe(32)
  })

  it('balances role exposure, option positions, recent window, and pair co-occurrence', () => {
    const allCounts = countRoles()
    expect([...allCounts.values()]).toEqual(Array(8).fill(16))

    const positionCounts = ROLES.map((role) =>
      [0, 1, 2, 3].map((position) =>
        CHIIKAWA_BOND_TEST.questions.filter((question) => question.options[position].reportId === role).length,
      ),
    )
    expect(positionCounts).toEqual(ROLES.map(() => [4, 4, 4, 4]))

    const recentCounts = countRoles(Array.from({ length: 8 }, (_, index) => 24 + index))
    expect([...recentCounts.values()]).toEqual(Array(8).fill(4))

    const pairCounts = new Map<string, number>()
    CHIIKAWA_BOND_TEST.questions.forEach((question) => {
      const roles = question.options.map((option) => option.reportId).sort()
      for (let left = 0; left < roles.length; left += 1) {
        for (let right = left + 1; right < roles.length; right += 1) {
          const key = roles[left] + '|' + roles[right]
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
        }
      }
    })
    const pairValues = [...pairCounts.values()]
    expect(pairValues).toHaveLength(28)
    expect(Math.max(...pairValues) - Math.min(...pairValues)).toBeLessThanOrEqual(1)
  })

  it('keeps every report reachable and configures the eight-question tie break', () => {
    expect(CHIIKAWA_BOND_TEST.scoring).toEqual({
      type: 'archetype',
      reports: [...ROLES],
      tieBreak: { type: 'recent-answers', window: 8 },
    })

    for (const target of ROLES) {
      const counts = new Map<Role, number>(ROLES.map((role) => [role, 0]))
      const answers = CHIIKAWA_BOND_TEST.questions.map((question) => {
        const targetIndex = question.options.findIndex((option) => option.reportId === target)
        if (targetIndex >= 0) {
          counts.set(target, (counts.get(target) ?? 0) + 1)
          return targetIndex
        }
        let bestIndex = 0
        let bestCount = Number.POSITIVE_INFINITY
        question.options.forEach((option, optionIndex) => {
          const current = counts.get(option.reportId as Role) ?? 0
          if (current < bestCount) {
            bestCount = current
            bestIndex = optionIndex
          }
        })
        const fallbackRole = question.options[bestIndex].reportId as Role
        counts.set(fallbackRole, (counts.get(fallbackRole) ?? 0) + 1)
        return bestIndex
      })
      expect(scoreTest(CHIIKAWA_BOND_TEST, answers).reportId).toBe(target)
    }
  })
})
