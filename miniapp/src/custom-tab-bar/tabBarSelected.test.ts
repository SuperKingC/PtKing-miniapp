import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(__dirname, 'index.tsx'), 'utf8')
const visibility = readFileSync(resolve(__dirname, 'tabBarVisibility.ts'), 'utf8')

/**
 * tabbar 选中态三级兜底契约：每个 tab 页持有独立 tabbar 实例，新实例挂载早于
 * onShow 广播。switchTo 点击与页面 onShow 都把乐观索引写进 storage（key 由
 * tabBarVisibility 叶子模块持有，hook 与组件共用），新实例挂载时读取兜底，
 * 避免先渲染旧选中态再被 onShow 广播纠正的跳变（用户反馈：点塔罗 tab 选中态不切）。
 */
describe('custom tab bar selected-state persistence', () => {
  it('persists the optimistic selection on click and seeds initial state from it', () => {
    expect(visibility).toContain("export const TABBAR_SELECTED_KEY = 'ptking:tabbar-selected'")
    expect(source).toContain('TABBAR_SELECTED_KEY')
    expect(source).toContain('readStoredSelectedIndex()')
    expect(source).toMatch(/switchTo[\s\S]*setStorageSync\(TABBAR_SELECTED_KEY, index\)/)
    // 挂载与初始 state 都按「本页路由 > storage > 路由兜底」取值
    expect(source).toMatch(/const initial = this\.ownRoute && byRoute >= 0 \? byRoute : stored >= 0 \? stored : byRoute/)
  })

  it('keeps optimistic setState and onShow broadcast as the primary paths', () => {
    expect(source).toContain("Taro.eventCenter.on(TABBAR_SELECT_EVENT, this.handleSelectEvent)")
    expect(source).toMatch(/switchTo[\s\S]*selected: index/)
    // 页面侧 onShow 也落 storage（tabbar 实例晚于广播挂载时的兜底）
    const hook = readFileSync(resolve(__dirname, '../hooks/useTabBarSelected.ts'), 'utf8')
    expect(hook).toContain('Taro.eventCenter.trigger(TABBAR_SELECT_EVENT, index)')
    expect(hook).toMatch(/setStorageSync\(TABBAR_SELECTED_KEY, index\)/)
    // 广播后守卫式补发一次，覆盖「实例晚于 onShow 订阅」的首次进入窗口
    expect(hook).toMatch(/setTimeout\(\s*\(\) => \{[\s\S]*TABBAR_SELECT_EVENT, index[\s\S]*\}, 160\)/)
  })
})
