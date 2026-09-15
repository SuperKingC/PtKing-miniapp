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
  it('卡片使用左图、中间真实文案、右侧按钮三个并列区域，左上角贴 TOP 奖牌、右上角贴 NEW 缎带，只有整卡处理点击', () => {
    const card = findElement('test-page__card')
    /* NEW/TOP 角标按条件渲染（表达式子节点），只断言类名存在于卡内 */
    expect(card.getText(page)).toContain('test-page__card-badge-new')
    expect(card.getText(page)).toContain('test-page__card-badge-top')
    /* 不再有 solo/堆叠两种落位 */
    expect(source).not.toContain('badge-top--solo')
    const medal = styleBlock('.test-page__card-badge-top')
    const ribbon = styleBlock('.test-page__card-badge-new')
    /* 奖牌 60x62 中心落图标角点右下让位处（卡内 (30,34)，2026-09-15 用户再让 4rpx）；NEW 缎带 112x45 钉卡片右上角，
       微悬出上/右缘贴角——上方净空 24rpx，悬出 ≤18rpx 不压 section 标题；两枚都静态不跳 */
    expect(medal).toContain('position: absolute')
    expect(medal).toContain('top: 3rpx')
    expect(medal).toContain('left: 0rpx')
    expect(medal).toContain('width: 60rpx')
    expect(medal).toContain('height: 62rpx')
    expect(ribbon).toContain('position: absolute')
    expect(ribbon).toContain('top: -18rpx')
    expect(ribbon).toContain('right: -12rpx')
    expect(ribbon).toContain('width: 112rpx')
    expect(ribbon).toContain('height: 45rpx')
    for (const block of [medal, ribbon]) {
      expect(block).not.toContain('animation')
      expect(block).toContain('bottom: auto')
    }
    expect(medal).toContain('right: auto')
    expect(ribbon).toContain('left: auto')
    /* 贴纸悬出卡外，卡片不得裁切；跳动 keyframes 已随静态化删除 */
    expect(styleBlock('.test-page__card')).not.toContain('overflow: hidden')
    expect(styles).not.toContain('test-page-badge-bounce')
    expect(childrenOf(card).map(className).filter(Boolean)).toEqual(['test-page__card-spot', 'test-page__card-content', 'test-page__card-go'])
    expect(card.getText(page).match(/onClick=/g)).toHaveLength(1)
    expect(card.getText(page)).toContain('openDetail(definition.id)')
    expect(findElement('test-page__card-content').getText(page)).toContain('{definition.title}')
    expect(findElement('test-page__card-content').getText(page)).toContain('{definition.questions.length}')
    expect(findElement('test-page__card-content').getText(page)).toContain('{definition.meta.minutes}')
    expect(findElement('test-page__card-go').getText(page)).toContain('开始测试')
  })

  it('品牌行与今日推荐蓝卡沿用真实每日推荐数据', () => {
    expect(source).toContain('测测子')
    expect(source).toContain('来测测你的另一面')
    /* 横幅走 v14（v11 画面+v13 同款修边：负 margin + 影随烘焙形状的已验收版式）。 */
    expect(source).toContain('hero-card-v14.png')
    /* 气球走 v39（v28 清晰圆球+J 线 + love 外圈）；公文包仍 v35。 */
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
    expect(source).toContain('pickDailyTest(definitions, now.getFullYear(), now.getMonth() + 1, now.getDate())')
    expect(source).toContain('openDetail(daily.id)')
  })

  it('保留五分类、注册表订阅与继续答题入口（搜索栏已移除）', () => {
    for (const contract of [
      'TEST_CATEGORIES.map', 'useState(listTestDefinitions)', 'subscribeTestRegistry(refresh)', 'useDidShow(refresh)',
      '${definition.id}:${definition.title}',
      'filterByCategory(definitions, activeCategory)',
      'pickRecommendedTests(definitions, recentIds, resume?.definition.id, 4)',
      'pickCategory(category.key)',
      '/pages/test-detail/index?testId=${encodeURIComponent(testId)}',
      '/pages/test-play/index?testId=${encodeURIComponent(resume.definition.id)}',
      'useShareAppMessage',
    ]) expect(source).toContain(contract)
    expect(source).not.toContain('test-page__search')
    expect(source).not.toContain('matchTests')
  })

  it('列表为单列全宽横向卡片，172rpx参考图方块图标（实体148rpx）占正常文档流', () => {
    expect(styleBlock('.test-page__grid')).toContain('flex-direction: column')
    const card = styleBlock('.test-page__card')
    expect(card).toContain('display: flex')
    expect(card).toContain('align-items: center')
    expect(card).toContain('width: 100%')
    expect(card).not.toContain('flex-direction: column')
    const icon = styleBlock('.test-page__card-spot')
    expect(icon).toContain('flex: 0 0 172rpx')
    expect(icon).toContain('width: 172rpx')
    expect(icon).toContain('height: 172rpx')
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

  it('分类切换当拍视口归零（非零滚动位切换内容高度骤减会连帧错位闪屏），零位切换零滚动', () => {
    /* onScroll 记录实时位,仅滚动位非零时才挂受控 scrollTop 归零;≈0 时零滚动零动画 */
    expect(source).toContain('const [scrollTop, setScrollTop] = useState<number | undefined>(undefined)')
    expect(source).toContain('scrollPosRef = useRef(0)')
    expect(source).toContain('if (scrollPosRef.current > 1)')
    expect(source).toContain('setScrollTop((prev) => (prev === undefined ? 0 : prev === 0 ? 0.01 : 0))')
    expect(source).toContain('onScroll={handleScroll}')
    expect(source).toContain('onScrollStop={handleScrollStop}')
    expect(source).toContain('pickCategory(category.key)')
    expect(source).not.toContain('onClick={() => setActiveCategory(category.key)}')
    /* scroll-into-view 在 enhanced 下强制动画滚动,不得使用 */
    expect(source).not.toContain('scrollIntoView=')
    /* ScrollView 关锚定双保险 */
    expect(source).toContain('scrollAnchoring={false}')
  })

  it('奶油白、浅雾蓝、桃色只覆盖本页，暗色主题保留独立配色', () => {
    const light = styleBlock('.test-page-shell.theme-light')
    expect(light).toContain('--color-page-bg: #fefaf5')
    expect(light).toContain('--color-card-bg: #fffdf8')
    expect(light).toContain('--test-hero-bg')
    expect(light).toContain('--test-action-bg')
    const dark = styleBlock('.test-page-shell.theme-dark')
    for (const token of ['--test-hero-bg:', '--test-action-bg:', '--test-capsule-bg:', '--test-highlight:']) expect(dark).toContain(token)
    expect(styles).not.toMatch(/(^|\n)(page|\.theme-light|\.theme-dark)\s*\{/)
    expect(source).toContain('test-page-shell theme-${theme}')
  })

  it('卡片和横幅使用参考图同色卡面+暖褐影（逐像素采样对齐），不裁切阴影', () => {
    /* 卡片厚度走全局 --shadow-card（实色接触带三层法） */
    const card = styleBlock('.test-page__card')
    expect(card).toContain('background: #fefaf4')
    expect(card).toContain('box-shadow: var(--shadow-card)')
    const hero = styleBlock('.test-page__hero')
    const heroImg = styleBlock('.test-page__hero-img')
    /* v11 版式：横幅负 margin 叠进品牌行，图高随宽自适应 */
    expect(hero).toContain('margin-top: -56rpx')
    expect(heroImg).toContain('width: 100%')
    expect(heroImg).toContain('height: auto')
    /* 影随烘焙形状（猫+云+圆角卡）：drop-shadow 随形，不用容器盒阴影避免图片直边下露出实条 */
    expect(heroImg).toContain('drop-shadow')
    expect(heroImg).not.toContain('overflow: hidden')
    expect(styles).not.toContain('test-page__hero-shade')
    /* 按钮剖面提为全局令牌，与二级页主 CTA 同层（值逐像素采样，见 app.scss） */
    const go = styleBlock('.test-page__card-go')
    expect(go).toContain('background: var(--action-btn-bg)')
    expect(go).toContain('box-shadow: var(--action-btn-shadow)')
    /* 接触影烘焙进 v10 tile，CSS 不再叠投影 */
    expect(styleBlock('.test-page__card-spot')).toContain('filter: none')
    /* 分类切换大增删卡片时 lazy 图重触发解码缺图一帧（整列闪），tile 不挂 lazyLoad */
    expect(source).not.toContain('cardSpot(definition)} mode="aspectFit" lazyLoad')
    /* 今日推荐整卡等宽自适应：widthFix、不挂 lazyLoad（首屏图延迟解码会让 filter 阴影层按未解码态出方形边）。
       断言做空白容忍（JSX 属性已折多行书写） */
    expect(source.replace(/\s+/g, ' ')).toContain('className="test-page__hero-img" src={heroCardImg} mode="widthFix"')
    expect(source).not.toContain('hero-shade')
    expect(source).not.toMatch(/hero-card-v\d+\.png" mode="scaleToFill"/)
    expect(source).not.toMatch(/hero-card-v\d+\.png" mode="scaleToFill" lazyLoad/)
    expect(source).not.toContain('hoverClass')
    expect(styles).not.toContain('--press')
  })
})
