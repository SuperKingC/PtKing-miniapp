import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'
const source = (file: string) => readFileSync(resolve(miniappRoot(), 'src', file), 'utf8')

describe('体验入口契约', () => {
  it('滚动视口无内容padding，间距交由内部容器承载', () => {
    const home = source('pages/test/index.tsx')
    expect(home).toContain('className="tab-page__scroll"')
    expect(home).toContain('<View className="test-page">')
    expect(home).toContain('scrollIntoView={scrollTarget}')
  })
  it('答题剩余按已答统计，保存成功才清草稿，不上报具体选项', () => {
    const play = source('pages/test-play/index.tsx')
    expect(play).toContain('getPlayProgress(answers.length, total)')
    expect(play).not.toContain('qIndex, optionIndex })')
    expect(play).toContain('if (!saved)')
    expect(play.indexOf('if (!saved)')).toBeLessThan(play.indexOf('clearTestDraft(definition.id)', play.indexOf('const result = scoreTest')))
    expect(play).toContain('reportSnapshot:')
    expect(play).toContain('motion-${motionPreference}')
  })
})
