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
    /* 胶囊形状在主 CTA/次级共用块里定义，与列表按钮同为 999rpx 全圆角 */
    expect(styleBlock('.test-detail__start, .test-detail__restart')).toContain('border-radius: 999rpx')
  })

  it('卡片 item 走全局 --shadow-card 实色接触带三层法，与列表/报告卡同层', () => {
    expect(styleBlock('.test-detail__card')).toContain('box-shadow: var(--shadow-card)')
  })

  it('次级「重新开始」保持低层级：柔和主色描边 + 卡面底，不用主 CTA 剖面', () => {
    const restart = styleBlock('.test-detail__restart')
    expect(restart).toContain('border: 2rpx solid var(--color-primary-soft)')
    expect(restart).toContain('background: var(--color-card-bg)')
    expect(restart).not.toContain('var(--action-btn-bg)')
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
