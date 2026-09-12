import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from '../../config/testPaths'

const styles = readFileSync(resolve(__dirname, 'index.scss'), 'utf8')
const appStyles = readFileSync(resolve(miniappRoot(), 'src/app.scss'), 'utf8')

// 去注释 + 合并换行，便于按「选择器列表」精确切块（共用选择器 .a, .b 不会被误当成单块）
const flatStyles = styles.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\r?\n\s*/g, ' ')

function styleBlock(selector: string): string {
  const blocks = [...flatStyles.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  const hit = blocks.find(([, selectorList]) => selectorList.trim() === selector)
  expect(hit, `缺少独立样式块 ${selector}`).toBeDefined()
  return hit![2]
}

describe('测试介绍页与测试中心同款按钮/卡片剖面', () => {
  it('主 CTA 复用全局按钮剖面（颜色+形状与测试中心「开始测试」一致）', () => {
    const start = styleBlock('.test-detail__start')
    expect(start).toContain('background: var(--action-btn-bg)')
    expect(start).toContain('box-shadow: var(--action-btn-shadow)')
    expect(start).toContain('color: #ffffff')
    /* 胶囊形状与列表按钮同为 999rpx 全圆角 */
    expect(start).toContain('border-radius: 999rpx')
  })

  it('卡片 item 走全局 --shadow-card 实色接触带三层法，与列表/报告卡同层', () => {
    expect(styleBlock('.test-detail__card')).toContain('box-shadow: var(--shadow-card)')
  })

  it('介绍页不再有「重新开始」次级按钮（重开走答题页离开确认）', () => {
    const source = readFileSync(resolve(__dirname, 'index.tsx'), 'utf8')
    expect(source).not.toContain('test-detail__restart')
    expect(source).not.toContain('重新开始')
    expect(flatStyles).not.toContain('test-detail__restart')
  })

  it('按钮剖面令牌在 app.scss 单处定义（参考稿逐像素采样值，主题稳定）', () => {
    expect(appStyles).toContain(
      '--action-btn-bg: linear-gradient(180deg, #fad6b5 0%, #f3bf98 26%, #f2bd95 52%, #e9ae85 84%, #d99e70 96%, #d08e5e 100%);',
    )
    expect(appStyles).toContain('--action-btn-shadow: inset 0 2rpx 3rpx rgba(255, 240, 225, 0.55),')
    expect(appStyles).toContain('0 4rpx 6rpx rgba(150, 94, 56, 0.22),')
    /* 只在 page 定义一次；暗色主题继承同色（参考稿按钮各主题同色） */
    expect([...appStyles.matchAll(/--action-btn-bg:/g)]).toHaveLength(1)
    expect([...appStyles.matchAll(/--action-btn-shadow:/g)]).toHaveLength(1)
  })
})

describe('介绍卡与按钮组在 [返回钮底边, 屏幕底部] 区域内垂直居中', () => {
  it('根节点纵向 flex + 顶部内边距以返回钮底边为界（不再用胶囊 inset）', () => {
    const root = styleBlock('.test-detail')
    expect(root).toContain('display: flex')
    expect(root).toContain('flex-direction: column')
    expect(root).toContain('min-height: 100vh')
    /* 上界 = --back-top + 钮高 88rpx + 呼吸；下界对称，保证居中在 [钮底边, 屏底] 中点 */
    expect(root).toContain('padding: calc(var(--back-top, 44px) + 88rpx + 24rpx) 32rpx 24rpx')
    expect(root).not.toContain('--page-top-inset')
    /* 下留白混入 env 安全区会打破上下对称、把整组顶高 */
    expect(root).not.toContain('env(safe-area-inset-bottom)')
  })

  it('内容组用上下 auto 边距均分剩余空间；内容超高时 auto 归零、从顶部起可滚动', () => {
    const body = styleBlock('.test-detail__body')
    expect(body).toContain('margin-top: auto')
    expect(body).toContain('margin-bottom: auto')
  })

  it('渲染把 card/disclaimer/start 都包进居中容器', () => {
    const source = readFileSync(resolve(__dirname, 'index.tsx'), 'utf8')
    const body = source.match(/<View className="test-detail__body">([\s\S]*?)\n      <\/View>/)
    expect(body, '缺少 .test-detail__body 包裹容器').not.toBeNull()
    for (const cls of ['test-detail__card', 'test-detail__disclaimer', 'test-detail__start']) {
      expect(body![1]).toContain(cls)
    }
  })
})
