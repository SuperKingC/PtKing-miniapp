import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (file: string) => readFileSync(require('node:path').resolve(__dirname, file), 'utf8')
describe('bright tarot entry wiring', () => {
  it('keeps the existing flow behind a light home and returns home on close', () => {
    const page = source('./index.tsx')
    expect(page).toContain('tarot-panel-v5.jpg')
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
  it('curtain entrance layers drape close, constellation line-up and fade-out reveal', () => {
    const page = source('./index.tsx')
    expect(page).toContain('tarot-curtain__glow')
    expect(page).toContain('tarot-curtain__star--a')
    expect(page).toContain("curtain === 'opening' ? 'tarot-page--reveal' : ''")
    // 帘内加载进度：宝珠环+胶囊条在合拢期间就显示预加载进度，完成后随帘淡出
    expect(page).toContain('onLoadProgress={handleLoadProgress}')
    expect(page).toContain('onLoadDone={handleLoadDone}')
    expect(page).toContain('tarot-curtain__loading-fill')
    expect(page).toContain('curtainLoaded ? \'仪式准备就绪\'')
    expect(page).toContain('星图绘制中')
    expect(page).toContain('猫咪布置占卜屋中')
    // 底栏随帘幕出现即藏：startFlow 先广播流程可见再开帘
    expect(page).toMatch(/setCurtainLoaded\(false\)[\s\S]*Taro\.eventCenter\.trigger\(TAROT_FLOW_VISIBILITY_EVENT, true\)/)
    const styles = source('./index.scss')
    expect(styles).toContain('@keyframes tarot-flow-reveal')
    expect(styles).toContain('@keyframes tarot-star-twinkle')
    expect(styles).toContain('.tarot-curtain--holding .tarot-curtain__glow')
    // 淡出式揭幕(不再横向拉开)：整帘 opacity 渐隐露出流程页
    expect(styles).toContain('@keyframes tarot-curtain-fade')
    // clay 布帘精致化：三重竖褶 + 顶部帷幔(扇贝垂边/垂穗摇摆)
    expect(styles).toContain('tarot-curtain__drape')
    expect(styles).toContain('tarot-curtain__valance-scallop')
    expect(styles).toContain('@keyframes tarot-tassel-sway')
    // classic 仪式三件套：流星斜掠、星星逐颗亮起连线
    expect(styles).toContain('tarot-curtain__meteor')
    expect(styles).toContain('@keyframes tarot-const-star-pop')
    expect(styles).toContain('@keyframes tarot-const-line-grow')
    expect(styles).toContain('tarot-curtain__const-line--b')
    // 加载宝珠环：百分比在环心，环轨旋转
    expect(styles).toContain('tarot-curtain__loading-ring')
    expect(styles).toContain('@keyframes tarot-curtain-orb-spin')
    // hold 加载完成即快进淡出(160ms 呼吸底线)，慢网 12s 兜底放行
    expect(page).toMatch(/if \(!curtainLoaded\) return[\s\S]*CURTAIN_HOLD_MIN_MS - elapsed/)
    expect(page).toContain('setTimeout(() => setCurtain(\'opening\'), 12000)')
    // 淡出播完后彻底卸载帘幕：WXSS 同节点 class 切换的 opacity 动画实测不重放，
    // 卸载是清屏的确定性兜底(用户反馈：帘幕卡住不消失)
    expect(page).toMatch(/if \(curtain !== 'opening'\) return[\s\S]*setCurtain\('idle'\), CURTAIN_OPEN_MS \+ 80/)
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
