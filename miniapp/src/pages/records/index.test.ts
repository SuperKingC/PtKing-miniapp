import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(require('node:path').resolve(__dirname, 'index.tsx'), 'utf8')
const styles = readFileSync(require('node:path').resolve(__dirname, 'index.scss'), 'utf8')

function styleBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = styles.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))
  expect(match, `缺少样式 ${selector}`).not.toBeNull()
  return match![1]
}

describe('bright records layout', () => {
  it('uses real counts, a standalone book and date groups', () => {
    expect(source).toContain('我的记录')
    expect(source).toContain('records-book-v4.png')
    /* 气球走 v39（v28 清晰圆球+J 线 + love 外圈）；公文包仍 v35 */
    expect(source).toContain('tile-fun-v39.png')
    expect(source).toContain('tile-career-v35.png')
    expect(source).not.toContain('tile-fun-v38.png')
    expect(source).not.toContain('tile-fun-v37.png')
    expect(source).not.toContain('tile-fun-v36.png')
    expect(source).not.toContain('tile-fun-v35.png')
    expect(source).not.toContain('tile-fun-v34.png')
    expect(source).not.toContain('tile-career-v34.png')
    expect(source).not.toContain('tile-fun-v31.png')
    expect(source).not.toContain('tile-career-v31.png')
    expect(source).not.toContain('tile-fun-v28.png')
    expect(source).not.toContain('tile-career-v28.png')
    expect(source).not.toContain('tile-fun-v27.png')
    expect(source).not.toContain('tile-career-v27.png')
    expect(source).not.toContain('tile-fun-v25.png')
    expect(source).not.toContain('tile-career-v25.png')
    expect(source).not.toContain('tile-fun-v23.png')
    expect(source).not.toContain('tile-career-v23.png')
    expect(source).not.toContain('tile-fun-v22.png')
    expect(source).not.toContain('tile-career-v22.png')
    expect(source).not.toContain('tile-fun-v13.png')
    expect(source).not.toContain('tile-career-v13.png')
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
  it('分类栏与测试主页同规格：整条等宽胶囊、无横向滚动', () => {
    const chips = styleBlock('.records-page__chips')
    expect(chips).toContain('background: var(--records-capsule-bg)')
    expect(chips).toContain('border-radius: 999rpx')
    expect(chips).toContain('padding: 4rpx')
    expect(chips).not.toContain('overflow-x: auto')
    const chip = styleBlock('.records-page__chip')
    expect(chip).toContain('flex: 1')
    expect(chip).toContain('min-width: 0')
    expect(chip).toContain('padding: 16rpx 4rpx')
    const active = styleBlock('.records-page__chip--on')
    expect(active).toContain('linear-gradient(180deg, #fce2c6 0%, #f5c29c 30%')
    expect(active).toContain('color: #ffffff')
    expect(styleBlock('.records-page-shell.theme-dark')).toContain('--records-capsule-bg: #332c25')
  })
  it('记录条箭头与「删除」留呼吸空隙，不贴死', () => {
    expect(styleBlock('.records-page__item-chevron')).toContain('margin-right: 8rpx')
    expect(styleBlock('.records-page__item-chevron')).not.toContain('margin-right: -4rpx')
  })
})
