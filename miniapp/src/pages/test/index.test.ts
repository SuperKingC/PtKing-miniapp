import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(__dirname, 'index.tsx'), 'utf8')
const styles = readFileSync(resolve(__dirname, 'index.scss'), 'utf8')
const page = ts.createSourceFile('index.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

function styleBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = styles.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))
  expect(match, `缺少样式 ${selector}`).not.toBeNull()
  return match![1]
}

function className(node: ts.JsxElement | ts.JsxSelfClosingElement): string | undefined {
  const opening = ts.isJsxElement(node) ? node.openingElement : node
  const attribute = opening.attributes.properties.find((item) => ts.isJsxAttribute(item) && item.name.getText(page) === 'className')
  if (!attribute || !ts.isJsxAttribute(attribute) || !attribute.initializer || !ts.isStringLiteral(attribute.initializer)) return undefined
  return attribute.initializer.text
}

function findElement(name: string): ts.JsxElement {
  let found: ts.JsxElement | undefined
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) && className(node) === name) found = node
    ts.forEachChild(node, visit)
  }
  visit(page)
  expect(found, `缺少元素 ${name}`).toBeDefined()
  return found!
}

function childrenOf(node: ts.JsxElement) {
  return node.children.filter((child): child is ts.JsxElement | ts.JsxSelfClosingElement => ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child))
}

describe('测试首页软陶单列布局', () => {
  it('卡片使用左图、中间真实文案、右侧按钮三个并列区域，只有整卡处理点击', () => {
    const card = findElement('test-page__card')
    expect(childrenOf(card).map(className)).toEqual(['test-page__card-spot', 'test-page__card-content', 'test-page__card-go'])
    expect(card.getText(page).match(/onClick=/g)).toHaveLength(1)
    expect(card.getText(page)).toContain('openDetail(definition.id)')
    expect(findElement('test-page__card-content').getText(page)).toContain('{definition.title}')
    expect(findElement('test-page__card-content').getText(page)).toContain('{definition.questions.length}')
    expect(findElement('test-page__card-content').getText(page)).toContain('{definition.meta.minutes}')
    expect(findElement('test-page__card-go').getText(page)).toContain('开始测试')
  })

  it('品牌行带铃铛、今日推荐蓝卡沿用真实每日推荐数据', () => {
    expect(source).toContain('测测子')
    expect(source).toContain('来测测你的另一面')
    expect(source).toContain('今日推荐')
    expect(source).toContain('test-hero-clay-v1.png')
    expect(source).toContain('icon-bell-v1.png')
    expect(source).toContain('pickDailyTest(definitions, now.getFullYear(), now.getMonth() + 1, now.getDate())')
    expect(source).toContain('openDetail(daily.id)')
  })

  it('保留五分类、搜索清空、注册表订阅与继续答题入口', () => {
    for (const contract of [
      'TEST_CATEGORIES.map', 'useState(listTestDefinitions)', 'subscribeTestRegistry(refresh)', 'useDidShow(refresh)',
      'filterByCategory(definitions, activeCategory)', 'matchTests(visible, keyword)',
      'pickRecommendedTests(definitions, recentIds, resume?.definition.id, 4)',
      'setQuery(event.detail.value)', "setQuery('')", 'setActiveCategory(category.key)',
      '/pages/test-detail/index?testId=${encodeURIComponent(testId)}',
      '/pages/test-play/index?testId=${encodeURIComponent(resume.definition.id)}',
      '当前分类没有相关测试', 'useShareAppMessage',
    ]) expect(source).toContain(contract)
  })

  it('列表为单列全宽横向卡片，112rpx圆角方块图标占正常文档流', () => {
    expect(styleBlock('.test-page__grid')).toContain('flex-direction: column')
    const card = styleBlock('.test-page__card')
    expect(card).toContain('display: flex')
    expect(card).toContain('align-items: center')
    expect(card).toContain('width: 100%')
    expect(card).not.toContain('flex-direction: column')
    const icon = styleBlock('.test-page__card-spot')
    expect(icon).toContain('flex: 0 0 112rpx')
    expect(icon).toContain('width: 112rpx')
    expect(icon).toContain('height: 112rpx')
    expect(icon).not.toContain('absolute')
  })

  it('长标题可折行，中间文案可收缩，右侧小按钮不会被挤压', () => {
    const content = styleBlock('.test-page__card-content')
    expect(content).toContain('flex: 1')
    expect(content).toContain('min-width: 0')
    expect(styles).toContain('box-sizing: border-box')
    expect(styles).toContain('overflow-wrap: anywhere')
    expect(styleBlock('.test-page__card-title')).not.toMatch(/(?:^|[;\n])\s*(?:height|max-height)\s*:|nowrap|line-clamp/)
    expect(styleBlock('.test-page__card-go')).toContain('flex-shrink: 0')
    expect(styleBlock('.test-page__card-go')).toContain('white-space: nowrap')
    expect(styleBlock('.test-page')).toContain('env(safe-area-inset-bottom)')
  })

  it('分类共享胶囊底，各分类等分宽度且无需横向滚动', () => {
    const chips = styleBlock('.test-page__chips')
    expect(chips).toContain('background: var(--test-capsule-bg)')
    expect(chips).toContain('border-radius: 999rpx')
    expect(chips).not.toContain('overflow-x: auto')
    expect(styleBlock('.test-page__chip')).toContain('flex: 1')
    expect(styleBlock('.test-page__chip')).toContain('min-width: 0')
  })

  it('奶油白、浅雾蓝、桃色只覆盖本页，暗色主题保留独立配色', () => {
    const light = styleBlock('.test-page-shell.theme-light')
    expect(light).toContain('--color-page-bg: #f7f2e9')
    expect(light).toContain('--color-card-bg: #fffdf8')
    expect(light).toContain('--test-hero-bg')
    expect(light).toContain('--test-action-bg')
    const dark = styleBlock('.test-page-shell.theme-dark')
    for (const token of ['--test-hero-bg:', '--test-action-bg:', '--test-capsule-bg:', '--test-highlight:', '--test-shadow:']) expect(dark).toContain(token)
    expect(styles).not.toMatch(/(^|\n)(page|\.theme-light|\.theme-dark)\s*\{/)
    expect(source).toContain('test-page-shell theme-${theme}')
  })

  it('卡片和横幅使用高光、厚度侧影、柔软投影，不裁切阴影', () => {
    expect(styleBlock('.test-page-shell.theme-light')).toMatch(/--test-shadow:[^;]+0 3rpx 0[^;]+0 12rpx 24rpx/)
    for (const selector of ['.test-page__card', '.test-page__hero']) {
      const block = styleBlock(selector)
      expect(block).toContain('border: 2rpx solid var(--test-highlight)')
      expect(block).toContain('box-shadow: var(--test-shadow)')
      expect(block).not.toContain('overflow: hidden')
    }
    expect(styleBlock('.test-page__card-go')).toContain('background: var(--test-action-bg)')
    expect(styleBlock('.test-page__card-go')).toContain('inset 0 2rpx 0')
  })
})
