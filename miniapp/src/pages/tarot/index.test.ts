import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (file: string) => readFileSync(require('node:path').resolve(__dirname, file), 'utf8')
describe('bright tarot entry wiring', () => {
  it('keeps the existing flow behind a light home and returns home on close', () => {
    const page = source('./index.tsx')
    expect(page).toContain('tarot-panel-v6.jpg')
    // v4 入口卡：v3 从参考稿裁切底部平切(切掉圆角)，回退 git 历史 v2 完整素材升版
    expect(page).toContain('tarot-card-single-v4.png')
    expect(page).toContain('tarot-cards-fan-v4.png')
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
  it('renders skin thumbnails from bundled per-skin crops (no network, no CSS fallback)', () => {
    const page = source('./index.tsx')
    expect(page).toContain('tarot-skin-classic-v1.jpg')
    expect(page).toContain('tarot-skin-clay-v1.jpg')
    expect(page).toContain('tarot-home__skin-thumb--${option}')
    expect(page).toContain('className="tarot-home__skin-thumb-img"')
    expect(page).toContain('mode="aspectFill"')
    // 两套皮肤各自包内小图，随包下发；不再依赖远程资产可达性
    expect(page).toContain('const skinThumbSrc = (option: TarotSkin): string')
    expect(page).toContain("option === 'classic' ? skinThumbClassic : skinThumbClay")
    expect(page).not.toContain('skin-thumb-fallback')
    expect(page).not.toContain('isUsableTarotAssetUrl')
    const styles = source('./index.scss')
    expect(styles).toMatch(/\.tarot-home__skin-thumb\s*{[^}]*height:\s*220rpx[^}]*overflow:\s*hidden/)
    expect(styles).toMatch(/\.tarot-home__skin-thumb-img\s*{[^}]*width:\s*100%[^}]*height:\s*100%/)
    // 旧版 CSS 兜底卡已随本地图移除
    expect(styles).not.toContain('tarot-home__skin-thumb-fallback')
    expect(styles).toMatch(/\.tarot-home__skins\s*{[^}]*margin-top:\s*44rpx/)
  })
  it('declares curtainLoaded before the hold effect that depends on it (regression: 12s stall)', () => {
    const page = source('./index.tsx')
    // 依赖数组里引用 curtainLoaded 时它必须已声明；否则 TDZ 读到 undefined，
    // effect 不随 curtainLoaded 变化重跑，帘幕只能等 12s 兜底 —— 用户「100% 后卡七八秒」根因
    const declIdx = page.indexOf('const [curtainLoaded, setCurtainLoaded] = useState(false)')
    const effectIdx = page.indexOf('}, [curtain, curtainLoaded])')
    expect(declIdx).toBeGreaterThan(-1)
    expect(effectIdx).toBeGreaterThan(-1)
    expect(declIdx).toBeLessThan(effectIdx)
    // 只允许一处声明（历史 bug 是下方重复声明导致上方引用 TDZ）
    expect(page.match(/const \[curtainLoaded, setCurtainLoaded\] = useState\(false\)/g)).toHaveLength(1)
    // 12s 慢网兜底只保留一份
    expect(page.match(/setTimeout\(\(\) => setCurtain\('opening'\), 12000\)/g)).toHaveLength(1)
  })
  it('curtain entrance layers drape close and fade-out reveal', () => {
    const page = source('./index.tsx')
    expect(page).toContain('tarot-curtain__glow')
    expect(page).toContain('tarot-curtain__star--a')
    expect(page).toContain("curtain === 'opening' ? 'tarot-page--reveal' : ''")
    // 星点只挂 clay：classic 星夜不再有月亮和星星（用户反馈）
    expect(page).toMatch(/\{skin === 'clay' && \(\s*<>[\s\S]*?tarot-curtain__star--a/)
    expect(page).not.toContain('tarot-curtain__moon')
    expect(page).not.toContain('tarot-curtain__const-star')
    expect(page).not.toContain('tarot-curtain__meteor')
    // 帘内加载进度：宝珠环+胶囊条仅在真正走网络时显示；全命中缓存则直接开帘
    expect(page).toContain('onLoadProgress={handleLoadProgress}')
    expect(page).toContain('onLoadDone={handleLoadDone}')
    expect(page).toContain('onLoadNetworkNeeded={handleLoadNetworkNeeded}')
    expect(page).toContain('tarot-curtain__loading-fill')
    expect(page).toContain('curtain !== \'opening\' && curtainNetworkNeeded')
    // 是否走网络在开帘前同步判定（否则合拢期间会先闪一下进度层）
    expect(page).toMatch(/setCurtainNetworkNeeded\(!areTarotAssetsCached\(skin\)\)[\s\S]*?TAROT_FLOW_VISIBILITY_EVENT, true/)
    const flow = source('../../features/tarot/MiniappTarotFlow.tsx')
    expect(flow).toContain('areTarotAssetsCached')
    expect(flow).toContain('onLoadNetworkNeeded?.(!areTarotAssetsCached(skin))')
    expect(page).toContain('curtainLoaded ? \'仪式准备就绪\'')
    expect(page).toContain('星图绘制中')
    expect(page).toContain('测测子布置牌桌中')
    // 底栏随帘幕出现即藏：startFlow 先广播流程可见再开帘
    expect(page).toMatch(/setCurtainLoaded\(false\)[\s\S]*Taro\.eventCenter\.trigger\(TAROT_FLOW_VISIBILITY_EVENT, true\)/)
    const styles = source('./index.scss')
    expect(styles).toContain('@keyframes tarot-flow-reveal')
    expect(styles).toContain('@keyframes tarot-star-twinkle')
    expect(styles).toContain('.tarot-curtain--holding .tarot-curtain__glow')
    // 打开帘子：两片帘向两侧真实拉开（不是 opacity 淡出），资源就绪后播放
    expect(styles).toContain('@keyframes tarot-curtain-open-left')
    expect(styles).toContain('@keyframes tarot-curtain-open-right')
    expect(styles).toMatch(/tarot-curtain-open-left[\s\S]*?translateX\(-101%\)/)
    expect(styles).toMatch(/tarot-curtain-open-right[\s\S]*?translateX\(101%\)/)
    expect(styles).toMatch(/\.tarot-curtain--opening \.tarot-curtain__panel--left\s*{[\s\S]*?animation:\s*tarot-curtain-open-left/)
    // 拉开时内缘重新鼓成弧线（与合拢反向），到展开时已成大弧
    expect(styles).toMatch(/tarot-curtain-open-left[\s\S]*?border-top-right-radius:\s*108rpx/)
    // 旧的淡出式揭幕与回缩(swell)已移除
    expect(styles).not.toContain('@keyframes tarot-curtain-fade')
    expect(styles).not.toContain('tarot-curtain-swell-left')
    expect(styles).not.toContain('tarot-curtain-swell-right')
    // 流程页在帘子拉开时轻微浮入（帘开的同时内容落定，叠出层次）
    expect(page).toContain("curtain === 'opening' ? 'tarot-page--reveal' : ''")
    expect(styles).toContain('@keyframes tarot-flow-reveal')
    // clay 布帘精致化：三重竖褶 + 顶部帷幔(扇贝垂边/垂穗摇摆)；底摆弧形垂边+
    // 褶皱联动(横移+绕顶端倾斜)+每道错相位+合拢回弹
    expect(styles).toContain('tarot-curtain__drape')
    expect(styles).toContain('tarot-curtain__valance-scallop')
    // 帘子内缘是曲线（起手大圆弧）并随合拢拉直，不是从头到尾的直边
    expect(styles).toMatch(/tarot-curtain-close-left[\s\S]*?border-top-right-radius:\s*96rpx/)
    expect(styles).toMatch(/tarot-curtain-close-left[\s\S]*?border-top-right-radius:\s*0/)
    expect(styles).toMatch(/\.tarot-curtain__panel\s*{[^}]*overflow:\s*hidden/)
    // 每道褶皱各自摆动：绕顶端摆动 + 错开相位
    expect(styles).toMatch(/\.tarot-curtain__drape\s*{[^}]*transform-origin:\s*50%\s*0/)
    expect(styles).toContain('--drape-tilt')
    expect(styles).toContain('.tarot-curtain--closing .tarot-curtain__drape--c { animation-delay: .16s; }')
    expect(styles).toMatch(/@keyframes tarot-drape-follow\s*{[\s\S]*?rotate\(/)
    expect(styles).toContain('@keyframes tarot-tassel-sway')
    expect(styles).toContain('@keyframes tarot-drape-follow')
    expect(styles).toMatch(/\.tarot-curtain--clay \.tarot-curtain__panel::after[\s\S]*?border-radius/)
    expect(styles).toContain('tarot-tassel-whip')
    // classic 星夜：只留中缝暖光；流星/星座连线/月牙/呼吸光环都已移除
    expect(styles).not.toContain('tarot-curtain__meteor')
    expect(styles).not.toContain('@keyframes tarot-const-star-pop')
    expect(styles).not.toContain('@keyframes tarot-const-line-grow')
    expect(styles).not.toContain('tarot-curtain__moon')
    expect(styles).not.toContain('tarot-curtain__glow--halo')
    expect(styles).not.toContain('@keyframes tarot-halo-breathe')
    expect(page).not.toContain('tarot-curtain__glow--halo')
    // 加载宝珠环：百分比在环心，环轨旋转
    expect(styles).toContain('tarot-curtain__loading-ring')
    expect(styles).toContain('@keyframes tarot-curtain-orb-spin')
    // hold 等「帘子盖严 + 资源就绪」，保留一点点呼吸；慢网 12s 兜底放行
    expect(page).toMatch(/if \(!curtainLoaded\) return[\s\S]*CURTAIN_HOLD_MIN_MS - elapsed/)
    expect(page).toContain('CURTAIN_HOLD_MIN_MS = 160')
    expect(page).toContain('CURTAIN_CLOSE_MS = 720')
    expect(page).toContain('CURTAIN_OPEN_MS = 1130')
    // 动画时长必须与 JS 常量一致：合拢 0.72s、拉开 0.78s(+右帘 0.05s 延迟)
    expect(styles).toContain('tarot-curtain-close-left .72s')
    expect(styles).toContain('tarot-curtain-open-left 1.08s')
    // 顺滑落位：缓起缓收 + 末段轻微过冲，不再用大过冲的硬回弹
    expect(styles).toContain('cubic-bezier(.34, .06, .2, 1.02)')
    expect(page).toContain('setTimeout(() => setCurtain(\'opening\'), 12000)')
    // 合拢动画走完才挂载流程：保证「帘先盖严再进去」
    expect(page).toMatch(/setCurtain\('closing'\)[\s\S]*holdStartRef\.current = Date\.now\(\)[\s\S]*setFlowOpen\(true\)/)
    // 拉开播完后彻底卸载帘幕（WXSS 换动画名才重播，卸载是清屏的确定性兜底）
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
