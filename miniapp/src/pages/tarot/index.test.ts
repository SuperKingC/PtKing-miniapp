import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (file: string) => readFileSync(require('node:path').resolve(__dirname, file), 'utf8')
describe('bright tarot entry wiring', () => {
  it('keeps the existing flow behind a light home and returns home on close', () => {
    const page = source('./index.tsx')
    expect(page).toContain('tarot-panel-v3.jpg')
    expect(page).toContain('tarot-card-single-v3.png')
    expect(page).toContain('tarot-cards-fan-v3.png')
    expect(page).toContain('快速获得指引')
    expect(page).toContain('深度探索指引')
    // 抽取今日指引保留流程内选牌阵；两个入口卡已定牌阵，跳过选牌阵阶段
    expect(page).toContain("startFlow('single', true)")
    expect(page).toContain("startFlow('single', false)")
    expect(page).toContain("startFlow('triple', false)")
    expect(page).toContain('chooseSpread={chooseSpread}')
    expect(page).toContain('flowOpen ?')
    expect(page).toContain('onClose={closeFlow}')
    expect(page).toContain('initialSpread={spread}')
  })
  it('renders skin thumbnails as full-bleed crops biased to each skin subject', () => {
    const page = source('./index.tsx')
    expect(page).toContain('tarot-home__skin-thumb--${option}')
    expect(page).toContain('tarot-home__skin-thumb-img')
    expect(page).toContain('mode="aspectFill"')
    const styles = source('./index.scss')
    expect(styles).toMatch(/\.tarot-home__skin-thumb\s*{[^}]*height:\s*220rpx[^}]*overflow:\s*hidden/)
    expect(styles).toMatch(/\.tarot-home__skin-thumb-img\s*{[^}]*height:\s*490rpx[^}]*margin-top:\s*-147rpx/)
    expect(styles).toContain('.tarot-home__skin-thumb--clay .tarot-home__skin-thumb-img { margin-top: -97rpx; }')
    expect(styles).toMatch(/\.tarot-home__skins\s*{[^}]*margin-top:\s*44rpx/)
  })
  it('curtain entrance layers star twinkle, seam glow, moon fade and flow reveal', () => {
    const page = source('./index.tsx')
    expect(page).toContain('tarot-curtain__glow')
    expect(page).toContain('tarot-curtain__star--a')
    expect(page).toContain("curtain === 'opening' ? 'tarot-page--reveal' : ''")
    const styles = source('./index.scss')
    expect(styles).toContain('@keyframes tarot-flow-reveal')
    expect(styles).toContain('@keyframes tarot-star-twinkle')
    expect(styles).toContain('.tarot-curtain--opening .tarot-curtain__dream')
    expect(styles).toContain('.tarot-curtain--holding .tarot-curtain__glow')
  })
  it('listens for history at the always-mounted page, including repeat requests', () => {
    expect(source('./index.tsx')).toContain('Taro.eventCenter.on(TAROT_HISTORY_OPEN_EVENT, openHistory)')
    expect(source('./index.tsx')).toContain('historyRequest={historyRequest}')
    expect(source('../../features/tarot/MiniappTarotFlow.tsx')).toContain('if (historyRequest > 0) setHistoryOpen(true)')
  })
  it('lets preselected entries skip the spread stage while the draw button keeps it', () => {
    const flow = source('../../features/tarot/MiniappTarotFlow.tsx')
    // 默认仍走完整流程（抽取今日指引），入口卡传 false 时剔除选牌阵一幕
    expect(flow).toContain('chooseSpread = true')
    expect(flow).toContain('stageOrder.filter((stage) => stage !== \'spread\')')
    expect(flow).toContain("dispatch({ type: 'continue', chooseSpread })")
    expect(flow).toContain('nextLabel={chooseSpread ? \'下一步 · 选牌阵\' : \'下一步 · 洗牌\'}')
    // 再占一次保留入场牌阵，不会重置回单牌
    expect(flow).toContain("dispatch({ type: 'restart', spread: state.spread })")
  })
})
