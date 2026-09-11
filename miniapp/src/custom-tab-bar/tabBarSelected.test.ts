import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(__dirname, 'index.tsx'), 'utf8')

/**
 * tabbar 选中态三级兜底契约：每个 tab 页持有独立 tabbar 实例，新实例挂载早于
 * onShow 广播。switchTo 点击时把乐观索引写进 storage，新实例挂载时读取兜底，
 * 避免先渲染旧选中态再被 onShow 广播纠正的跳变（用户反馈：点塔罗 tab 选中态不切）。
 */
describe('custom tab bar selected-state persistence', () => {
  it('persists the optimistic selection on click and seeds initial state from it', () => {
    expect(source).toContain("export const TABBAR_SELECTED_KEY = 'ptking:tabbar-selected'")
    expect(source).toContain('readStoredSelectedIndex()')
    expect(source).toMatch(/switchTo[\s\S]*setStorageSync\(TABBAR_SELECTED_KEY, index\)/)
    // 挂载与初始 state 都按「本页路由 > storage > 路由兜底」取值
    expect(source).toMatch(/const initial = this\.ownRoute && byRoute >= 0 \? byRoute : stored >= 0 \? stored : byRoute/)
  })

  it('keeps optimistic setState and onShow broadcast as the primary paths', () => {
    expect(source).toContain("Taro.eventCenter.on(TABBAR_SELECT_EVENT, this.handleSelectEvent)")
    expect(source).toMatch(/switchTo[\s\S]*selected: index/)
  })
})
