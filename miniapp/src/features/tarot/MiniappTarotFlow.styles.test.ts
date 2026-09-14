import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const stylesPath = path.resolve(__dirname, 'MiniappTarotFlow.scss')
const shuffleStagePath = path.resolve(__dirname, 'MiniappTarotShuffleStage.tsx')

const cardBackStagePaths = [
  'MiniappTarotShuffleStage.tsx',
  'MiniappTarotCutStage.tsx',
  'MiniappTarotFanStage.tsx',
  'MiniappTarotCard.tsx',
]

describe('miniapp tarot WXSS compatibility', () => {
  it('drops the flow header below the wechat capsule via the injected top inset', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const flow = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFlow.tsx'), 'utf8')

    // 头部 padding 走胶囊底边注入的 --page-top-inset，不再只用状态栏估高
    expect(styles).toMatch(/\.miniapp-tarot__header\s*{[^}]*padding:\s*var\(--page-top-inset, 88px\)/)
    expect(styles).not.toContain('calc(72rpx + env(safe-area-inset-top))')
    // Flow 根节点注入该变量，叉叉/标题/历史钮整体下移到三个点按钮之下
    expect(flow).toContain("import { getTopInsetPx, topInsetStyle } from '../../services/navMetrics'")
    expect(flow).toContain('getTarotStageFit')
    expect(flow).toContain('--tarot-stage-scale')
    expect(flow).toMatch(/className=\{\['miniapp-tarot'[\s\S]*?style=\{\{/)
  })

  it('does not emit universal selectors unsupported by the WeChat WXSS compiler', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(styles).not.toMatch(/\.miniapp-tarot\s+\*/)
    expect(styles).not.toMatch(/\.miniapp-tarot\s+\*::/)
  })

  it('renders a visible state-driven arcane shuffle ritual', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const shuffleStage = fs.readFileSync(shuffleStagePath, 'utf8')

    expect(shuffleStage).toContain('useState(false)')
    expect(shuffleStage).toContain('setIsShuffling(true)')
    expect(shuffleStage).toContain('setIsShuffling(false)')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-deck--active')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-deck--complete')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-orbit--outer')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-rune')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-burst')
    expect(styles).toContain('@keyframes miniapp-tarot-orbit-spin')
    expect(styles).toContain('@keyframes miniapp-tarot-rune-charge')
    expect(styles).toContain('@keyframes miniapp-tarot-shuffle-burst')
  })

  it('uses an expanded, layered shuffle motion with wider card trajectories', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // layer-rotation loop: cards fly out and land one visible layer deeper each pass
    expect(styles).toContain('miniapp-tarot-shuffle-left 5.6s')
    expect(styles).toContain('miniapp-tarot-shuffle-right 5.6s')
    expect(styles).toContain('translateX(-138%)')
    expect(styles).toContain('translateX(38%)')
    expect(styles).toContain('--z1')
    expect(styles).toContain('z-index: var(--z2)')
    expect(styles).toContain('z-index: 30')
    // pile step is thick enough to expose the layering edges
    expect(styles).toContain('* 5}rpx')
    // every card owns a unique phase (.56s apart) so no two cards fly in lockstep
    expect(styles).toContain('--shuffle-delay')
    expect(styles).toContain('animation-delay: var(--shuffle-delay)')
    // floating deck drift while holding
    expect(styles).toContain('@keyframes miniapp-tarot-deck-hover')
    // arcane circle redesign: soft aura + invisible circular orbits with light motes + dashed rune ring
    expect(styles).toContain('@keyframes miniapp-tarot-mist-glow')
    expect(styles).toContain('@keyframes miniapp-tarot-orbit-spin')
    expect(styles).toContain('@keyframes miniapp-tarot-rune-spin')
    expect(styles).toContain('border: 2rpx dashed var(--tarot-rune-ring)')
    expect(styles).toMatch(/\.miniapp-tarot__progress > view \{[\s\S]*?transition: width \.42s/)
    // rune circle is bigger than the card (226x356) so the arcane ring wraps the pile
    expect(styles).toContain('width: 430rpx')
    expect(styles).toContain('border-radius: 24rpx')
    expect(styles).toContain('width: 310rpx')
    expect(styles).not.toContain('width: 600rpx')
    // effects centered on the taller stepped pile, deck box tall enough to clear the bar
    expect(styles).toContain('top: 218rpx')
    expect(styles).toContain('height: 430rpx')
    // rune star pulses gently (no square box-shadow glow)
    expect(styles).toContain('scale(1.12)')
  })

  it('shares one vertical rhythm across ritual stages and keeps text clear of the flying deck', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const shuffleStage = fs.readFileSync(shuffleStagePath, 'utf8')

    expect(shuffleStage).toContain('miniapp-tarot__stage--shuffle')
    // shuffle / cut / fan / reveal all reuse the same base ritual layout,
    // so title position and gaps stay consistent across every stage
    expect(styles).toMatch(/\.miniapp-tarot__stage--ritual,[\s\S]*?\.miniapp-tarot__stage--fan,[\s\S]*?\.miniapp-tarot__stage--reveal \{[\s\S]*?padding-top: 60rpx/)
    // spacers above/below the card area position it between the fixed title
    // and the docked controls (auto margins pooled all free space at the
    // stage bottom in the WeChat renderer); the top spacer grows more so
    // the deck lands on the sanctuary ring's center (measured y≈53%)
    expect(shuffleStage).toContain('miniapp-tarot__spacer--top')
    expect(shuffleStage).toContain('miniapp-tarot__fit')
    expect(styles).toMatch(/\.miniapp-tarot__spacer \{[\s\S]*?flex: 1 1 0/)
    expect(styles).toMatch(/\.miniapp-tarot__spacer \{[\s\S]*?min-height: 48rpx/)
    expect(styles).toMatch(/\.miniapp-tarot__spacer--top \{[\s\S]*?flex-grow: 3/)
    // trajectory stays below the title line
    expect(styles).toContain('translateY(-46rpx) rotate(-17deg)')
    expect(styles).not.toContain('translateY(-72rpx)')
  })

  it('moves the clay guidance into a single speech bubble on the cat and drops the top progress rows', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // clay 场景里测测子就在牌桌对面说话：顶部进度点与洗牌进度条都压在猫头天际线上，一并去掉
    expect(styles).toMatch(/\.miniapp-tarot__progress,\s*\n\s*\.miniapp-tarot__shuffle-bar \{\s*\n\s*display: none;/)
    // 气泡只有标题这一枚（完整圆角 + 收窄宽度），不会出现两半拼贴的接缝
    expect(styles).toMatch(/\.miniapp-tarot__stage--ritual > \.miniapp-tarot__title,[\s\S]*?max-width: 400rpx;[\s\S]*?border-radius: 26rpx;/)
    // 气泡浮到测测子头顶之上：视口固定定位（不参与阶段布局、不受阶段裁切），
    // 左缘从叉叉钮右侧起（left），右端靠 max-width 停在微信胶囊左侧；
    // 钉住 bottom 79.7vh，文字变高只抬上沿，箭头位置不变
    expect(styles).toMatch(/\.miniapp-tarot__stage--ritual > \.miniapp-tarot__title,[\s\S]*?position: fixed;[\s\S]*?top: auto;[\s\S]*?bottom: 79\.7vh;/)
    expect(styles).toMatch(/\.miniapp-tarot__stage--ritual > \.miniapp-tarot__title,[\s\S]*?left: 124rpx;/)
    // 气泡改成 fixed 不再占流内高度，阶段用 padding-top 补回那截高度；
    // 牌组按视口缩放收进一屏，不再靠滚动露按钮
    expect(styles).toMatch(/\.miniapp-tarot__stage--ritual,[\s\S]*?padding-top: 190rpx;[\s\S]*?overflow: hidden;/)
    // clay 四仪式阶段把 header 的牌阵名藏掉（visibility 保留占位），那条带让给气泡
    expect(styles).toMatch(/&\.miniapp-tarot--clay-ritual \.miniapp-tarot__header-title \{\s*\n\s*visibility: hidden;/)
    // 尾巴挂在标题下沿、朝下指着猫
    expect(styles).toMatch(/\.miniapp-tarot__stage--ritual > \.miniapp-tarot__title::after,[\s\S]*?bottom: -11rpx;/)
    // classic 的底部状态行已并进气泡那句话，clay 不再单独显示
    expect(styles).toMatch(/\.miniapp-tarot__stage--ritual > \.miniapp-tarot__hint,[\s\S]*?\.miniapp-tarot__stage--fan > \.miniapp-tarot__hint \{\s*\n\s*display: none;/)
    expect(styles).not.toContain('order: -2;')
  })

  it('aligns the clay shuffle pile with the cut pile so the deck does not jump between stages', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // classic 的牌堆对准背景金环中心；clay 桌面更低、猫爪搭在桌沿，故整叠缩小一档。
    // 落位与切牌牌堆对齐：切牌牌面 top 87rpx（中心 226rpx），洗牌原 148rpx（中心 287rpx）
    // 会低 61rpx，用户要求「洗牌结算后的牌位和下一幕一致」，故整组统一上移到同一中心。
    expect(styles).toMatch(/\.miniapp-tarot__deck-card \{\s*\n\s*top: 87rpx;\s*\n\s*width: 176rpx;\s*\n\s*height: 278rpx;/)
    expect(styles).toMatch(/\.miniapp-tarot__shuffle-deck::after,\s*\n\s*\.miniapp-tarot__shuffle-orbit,[\s\S]*?top: 251rpx;/)
    // 软晕层只做 translateX，top 是圆上沿而非圆心
    expect(styles).toMatch(/\.miniapp-tarot__shuffle-deck::before \{[\s\S]*?top: 71rpx;/)
    expect(styles).toMatch(/\.miniapp-tarot__shuffle-orbit--outer \{[\s\S]*?width: 313rpx;/)
    expect(styles).toMatch(/\.miniapp-tarot__shuffle-burst \{[\s\S]*?width: 337rpx;/)
    // 洗牌牌堆顶上那条 6rpx 边距会让它比切牌再低 3px，clay 抹平
    expect(styles).toMatch(/\.miniapp-tarot__shuffle-deck \{\s*\n\s*margin-top: 0;/)

    // 切牌是洗牌的下一幕，牌面/整叠必须同一套缩小，否则一切牌牌就"变大变高"：
    // 牌面 214×326 → 167×254，整叠 230×356 → 179×278
    expect(styles).toMatch(/\.miniapp-tarot__cut-half \{\s*\n\s*top: 87rpx;\s*\n\s*width: 179rpx;\s*\n\s*height: 278rpx;\s*\n\s*margin-left: -90rpx;/)
    expect(styles).toMatch(/\.miniapp-tarot__cut-sheet,\s*\n\s*\.miniapp-tarot__cut-face \{\s*\n\s*width: 167rpx;\s*\n\s*height: 254rpx;/)
    // 起牌侧移量同比例缩，抬起的那叠不会飞得比牌自己还宽；
    // 必须带 :not(--swapped) 守卫，否则奇数刀两叠同时起飞（详见下方专门用例）
    expect(styles).toMatch(/\.miniapp-tarot__cut-deck--cutting:not\(\.miniapp-tarot__cut-deck--swapped\) \.miniapp-tarot__cut-half--right,[\s\S]*?translate\(117rpx, -66rpx\) rotate\(7deg\)/)
  })

  it('lowers the clay cut/fan/reveal cards below the crystal ball and recolors the name plate', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // 水晶球立在桌面中上部，切牌/抽牌/翻牌三幕的牌组原来落在阶段中线、牌顶压住球身。
    // 场景层底锚放大上移后球座抬到约视口 37%，牌组顶端收到阶段高度 28%，落在球座之下。
    // 洗牌必须同列（否则洗牌牌堆比切牌低一截、换幕时牌位跳动）；
    // flex 用 `0 1 28%`：有余量时恒为 28%（位置一致），短屏内容放不下时先收缩 spacer，
    // 而不是把牌组压扁（375×667 曾把牌扇压到 20px 高 → 牌溢出被裁）。
    expect(styles).toMatch(/\.miniapp-tarot__stage--shuffle > \.miniapp-tarot__spacer--top,[\s\S]*?\.miniapp-tarot__stage--cut > \.miniapp-tarot__spacer--top,[\s\S]*?\.miniapp-tarot__stage--fan > \.miniapp-tarot__spacer--top,[\s\S]*?\.miniapp-tarot__stage--reveal > \.miniapp-tarot__spacer--top \{[\s\S]*?max-height: calc\(40vh - 200rpx\);/)
    // 下 spacer 钉死，上 spacer 唯一决定牌组位置（否则弹性 spacer 会吸走空间、牌组原地不动）
    expect(styles).toMatch(/\.miniapp-tarot__spacer:not\(\.miniapp-tarot__spacer--top\) \{[\s\S]*?display: none;/)
    // 牌组容器不被 flex 压缩：牌扇/牌位/翻牌行都设 flex: none
    expect(styles).toMatch(/\.miniapp-tarot__shuffle-deck,[\s\S]*?\.miniapp-tarot__cut-deck,[\s\S]*?\.miniapp-tarot__picked-row,[\s\S]*?\.miniapp-tarot__fan,[\s\S]*?\.miniapp-tarot__reveal-row \{\s*\n\s*flex: none;/)
    // 抽牌组的牌扇压矮一档（容器须 ≥ 牌高 218rpx + bottom 20rpx 才不溢出压按钮）
    expect(styles).toMatch(/\.miniapp-tarot__fan \{\s*height: 270rpx;/)
    // 翻牌名牌框：classic 暗紫星夜牌盒换成与气泡/卡片同一支奶白底 + 软棕边 + 深棕字
    expect(styles).toMatch(/\.miniapp-tarot-card__labels \{[\s\S]*?border-color: rgba\(160, 118, 82, \.24\);[\s\S]*?color: #6b4a33;[\s\S]*?background: #fffef9;/)
    // 基础（classic）名牌框仍走暗紫底，clay 只是覆盖
    expect(styles).toMatch(/\.miniapp-tarot-card__labels \{[\s\S]*?background: rgba\(17, 11, 28, \.88\);/)
  })

  it('picks a legible ink for the clay skip action instead of the accent orange', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // 底部的「跳过…」原来用 --tarot-accent-strong(#c97a4a) 橙字直接压在米色桌面上，
    // 橙字与同色桌面糊成一片；clay 换成最深深棕实字 + 浅奶油描边光晕托起笔画
    expect(styles).toMatch(/clay 换成最深的深棕实字[\s\S]*?\.miniapp-tarot__text-action \{\s*\n\s*color: #5d3f2c;\s*\n\s*font-weight: var\(--font-weight-semibold\);\s*\n\s*text-shadow:/)
    // classic 一字未动：基础 .miniapp-tarot__text-action 仍走 accent
    expect(styles).toMatch(/\.miniapp-tarot__text-action \{\s*\n\s*margin: 0;\s*\n\s*padding: 8rpx 24rpx;\s*\n\s*color: var\(--tarot-accent-strong\);/)
  })

  it('restacks the deck as one pile with a top-first reorder once shuffling completes', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const shuffleStage = fs.readFileSync(shuffleStagePath, 'utf8')

    expect(styles).toContain('@keyframes miniapp-tarot-shuffle-settle')
    // cards lift high, swing aside, then return to the single stacked position
    expect(styles).toContain('translateY(-110rpx) rotate(-6deg)')
    expect(styles).toContain('z-index: 30')
    // top card flies first: card 10 has no delay, deeper cards wait longer
    expect(styles).toContain('.miniapp-tarot__shuffle-deck--complete .miniapp-tarot__deck-card')
    expect(styles).toContain('(10 - $index) * 0.06')
    expect(styles).not.toContain('--settle-x')
    // complete state pauses while the user keeps holding, so the active loop wins
    expect(shuffleStage).toContain('progress >= 100 && !isShuffling')
  })

  it('fires a crisp full-size completion ring instead of an upscaled blurry circle', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // 满尺寸细环(430rpx/2rpx 边)只放大 2 倍：旧 30rpx 环放大 15 倍会把边框插值成粗糊带
    expect(styles).toMatch(/\.miniapp-tarot__shuffle-burst \{[\s\S]*?width: 430rpx/)
    expect(styles).toMatch(/\.miniapp-tarot__shuffle-burst \{[\s\S]*?border: 2rpx solid var\(--tarot-burst\)/)
    expect(styles).toContain('--tarot-burst-glow')
    expect(styles).not.toContain('scale(15)')
    expect(styles).not.toContain('scale(12)')
  })

  it('cuts one centered deck: top packet lifts aside and restacks below', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const cutStage = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotCutStage.tsx'), 'utf8')

    // the cut column shares the unified ritual rhythm (fixed title, auto-centered deck)
    expect(cutStage).toContain('onSkip')
    expect(cutStage).toContain('跳过切牌')
    expect(cutStage).toContain('miniapp-tarot__stage--cut')
    expect(cutStage).toContain('miniapp-tarot__stage--ritual')

    // both halves rest stacked as a single centered pile
    expect(styles).toContain('margin-left: -115rpx')
    // the current top packet lifts up-right while the bottom packet stays
    expect(styles).toContain('translate(150rpx, -84rpx) rotate(7deg)')
    // which half lifts follows cut parity, so the old bottom packet ends on top
    expect(styles).toContain('.miniapp-tarot__cut-deck--swapped.miniapp-tarot__cut-deck--cutting')
    // quick lift, springy landing
    expect(styles).toContain('transition-duration: .3s')
    expect(styles).toContain('cubic-bezier(.34, 1.28, .4, 1)')
    // arcane flash pulse while the cut happens
    expect(styles).toContain('@keyframes miniapp-tarot-cut-flash')
    // lifted packet glows with a purple aura while airborne (skin-scoped via --tarot-cut-lift-shadow)
    expect(styles).toContain('drop-shadow(0 16rpx 22rpx var(--tarot-cut-lift-shadow)) brightness(1.1)')
    // stardust rises as the cut lands
    expect(styles).toContain('@keyframes miniapp-tarot-cut-spark')
  })

  it('advances straight to shuffling by tapping a spread deck, fading the whole scene out', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const spreadStagePath = path.resolve(__dirname, 'MiniappTarotSpreadStage.tsx')
    const spreadStage = fs.readFileSync(spreadStagePath, 'utf8')
    const flowSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFlow.tsx'), 'utf8')

    // no bottom "next" button remains in the spread stage
    expect(spreadStage).not.toContain('下一步 · 洗牌')
    expect(spreadStage).not.toContain('onContinue')
    // tapping a deck selects it and advances in one gesture
    expect(spreadStage).toContain('onSelect(option.key)')
    expect(flowSource).toContain('selectSpread')
    // an opaque dark curtain covers the swap so the main page never flashes through
    expect(flowSource).toContain('miniapp-tarot__fade')
    expect(styles).toContain('.miniapp-tarot__fade')
    expect(styles).toMatch(/\.miniapp-tarot__fade \{[\s\S]*?transition: opacity/)
    expect(styles).toMatch(/\.miniapp-tarot--leaving \.miniapp-tarot__fade \{[\s\S]*?opacity: 1/)
    // the sanctuary background stays clearly visible with a light veil
    expect(styles).toMatch(/\.miniapp-tarot__background \{[\s\S]*?opacity: \.88/)
    expect(styles).toContain('rgba(9, 5, 17, .32) 64%')
  })

  it('deals the fan in with staggered rise-and-settle motion and a centered column', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const fanStage = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFanStage.tsx'), 'utf8')

    // fan pose lives in CSS vars so keyframes can reuse it; flight x/y come from getFanFlightVars
    expect(fanStage).not.toContain('rotate(${offset')
    expect(fanStage).toContain('getFanFlightVars')
    expect(styles).toContain('--fx')
    expect(styles).toContain('translateX(var(--fx)) translateY(var(--fy)) rotate(var(--fr))')
    // staggered deal-in: cards rise from the deck position below and settle into the fan
    expect(styles).toContain('@keyframes miniapp-tarot-fan-deal')
    expect(styles).toContain('--deal')
    expect(styles).toContain('animation-delay: var(--deal)')
    // flight arcs straight into the picked slot being filled, no ghost card left in the fan
    expect(styles).toContain('var(--fly-x, 0rpx)')
    expect(styles).toContain('miniapp-tarot-card-flight .45s')
    expect(fanStage).toContain('onFinishPick(flyingCard), 450')
    // at handoff kill every animation so dropping --flying never restarts fan-deal from the deck
    expect(styles).toMatch(/fan-card--picked \{[\s\S]*?animation: none/)
    expect(styles).toMatch(/fan-card--picked \{[\s\S]*?transition: none/)
    // picked slot pops in with a golden flash
    expect(styles).toContain('@keyframes miniapp-tarot-slot-pop')
    // the spacer pair centers the slot row + fan group in the shared rhythm
    expect(styles).toMatch(/\.miniapp-tarot__fan \{[\s\S]*?margin: -12rpx 0 0/)
  })

  it('fills every card face, flattens after the flip, and keeps label boxes apart', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const cardSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotCard.tsx'), 'utf8')

    // artworks with a baked-in cream frame get a slight zoom so the face bleeds fully
    expect(styles).toMatch(/\.miniapp-tarot-card__art \{[\s\S]*?transform: scale\(1\.07\)/)
    expect(styles).toContain('rotate(180deg) scale(1.07)')
    // once the flip settles the 3D context is dropped for crisp rasterization
    expect(cardSource).toContain('miniapp-tarot-card--settled')
    expect(styles).toMatch(/--settled \.miniapp-tarot-card__body \{[\s\S]*?transform-style: flat/)
    expect(styles).toMatch(/--settled \.miniapp-tarot-card__front \{[\s\S]*?transform: none/)
    // label boxes are narrow enough to stay separated and sit clear of the card
    expect(styles).toMatch(/\.miniapp-tarot-card__labels \{[\s\S]*?top: calc\(100% \+ 24rpx\)/)
    expect(styles).toMatch(/\.miniapp-tarot-card__labels \{[\s\S]*?width: 180rpx/)
    expect(styles).toMatch(/\.miniapp-tarot__reveal-slot \{[\s\S]*?padding: 0 0 120rpx/)
  })

  it('keeps every shuffle animation disabled under reduced motion', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toContain('animation-duration: .01ms !important')
    expect(styles).toContain('transition-duration: .01ms !important')
  })

  it('gates the tarot flow behind a resource download overlay with progress', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const flowSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFlow.tsx'), 'utf8')

    // 流程头部：副题仅一行(选牌阵/提问阶段名)，无「塔罗密室」主标题
    expect(flowSource).not.toContain('塔罗密室')
    expect(flowSource).toContain("state.stage === 'question' ? '聆听内心的提问' : findTarotSpread(state.spread).label")

    expect(flowSource).toContain('preloadTarotResources')
    // 预加载进度/完成外抛给页面帘幕层(帘幕开场动画显示同一份进度)
    expect(flowSource).toContain('onLoadProgress?.(p)')
    expect(flowSource).toContain('onLoadDone?.()')
    expect(flowSource).toContain('resourcesLoaded')
    expect(flowSource).toContain('loadProgress')
    expect(flowSource).toContain('miniapp-tarot__loading')
    expect(flowSource).toContain('loadError')
    expect(flowSource).toContain('failedUrls.length === 0')
    expect(flowSource).toContain('setResourcesLoaded(false)')
    expect(flowSource).toContain('重新加载')
    expect(flowSource).toContain('正在下载塔罗资源')
    expect(flowSource).not.toContain('文字模式')
    expect(flowSource).not.toMatch(/setResourcesLoaded\(true\)[\s\S]*failedUrls/)
    expect((flowSource.match(/miniapp-tarot__loading_exit/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(styles).toContain('.miniapp-tarot__loading {')
    expect(styles).toContain('.miniapp-tarot__loading_ring')
    expect(styles).toContain('.miniapp-tarot__loading_retry')
    expect(styles).toContain('@keyframes tarot-loading-spin')
  })

  it('offers retry and exit controls inside the resource failure branch', () => {
    const flowSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFlow.tsx'), 'utf8')
    const failureBranch = flowSource.match(/\{loadError \? \(([\s\S]*?)\) : \(/)?.[1]

    expect(failureBranch).toBeDefined()
    expect(failureBranch).toMatch(/<Button\b[^>]*onClick=\{loadResources\}[^>]*>重新加载<\/Button>/)
    expect(failureBranch).toMatch(/<Button\b[^>]*aria-label="退出塔罗"[^>]*onClick=\{onClose\}[^>]*>退出塔罗<\/Button>/)
    expect(failureBranch?.match(/退出塔罗/g)).toHaveLength(2)
  })

  it('lays five-card reveals as three on top and two below', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const revealStage = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotRevealStage.tsx'), 'utf8')

    expect(revealStage).toContain('miniapp-tarot__reveal-row--5')
    expect(revealStage).toContain('drawn.length === 5')
    // width is exactly 3×152 + 2×24 so the 4th card must wrap
    expect(styles).toMatch(/\.miniapp-tarot__reveal-row--5 \{[\s\S]*?max-width: 504rpx/)
    expect(styles).toMatch(/\.miniapp-tarot__reveal-row--5 \{[\s\S]*?gap: 16rpx 24rpx/)
    expect(styles).toMatch(/reveal-row--5 \.miniapp-tarot-card--compact \{[\s\S]*?width: 152rpx/)
    expect(styles).toMatch(/reveal-row--5 \.miniapp-tarot-card--compact \{[\s\S]*?height: 240rpx/)
  })

  it('lifts classic one- and three-card reveals and stacks five pick slots 3+2', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const revealStage = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotRevealStage.tsx'), 'utf8')
    const fanStage = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFanStage.tsx'), 'utf8')

    expect(revealStage).toContain('miniapp-tarot__stage--reveal-${drawn.length}')
    expect(styles).toMatch(/\.miniapp-tarot__stage--reveal-1 > \.miniapp-tarot__spacer--top,[\s\S]*?\.miniapp-tarot__stage--reveal-3 > \.miniapp-tarot__spacer--top \{[\s\S]*?flex-grow: 1/)
    expect(fanStage).toContain('miniapp-tarot__stage--fan-${needCount}')
    expect(fanStage).toContain('getFanFlightVars(needCount, picked.length, skin)')
    // 3×152 + 2×28 so the 4th slot wraps; clay 136×212 / 20（仍小于 classic）
    expect(styles).toMatch(/\.miniapp-tarot__picked-row--5 \{[\s\S]*?flex-wrap: wrap/)
    expect(styles).toMatch(/\.miniapp-tarot__picked-row--5 \{[\s\S]*?max-width: 512rpx/)
    expect(styles).toMatch(/picked-row--5 \.miniapp-tarot__picked-slot \{[\s\S]*?width: 152rpx/)
    expect(styles).toMatch(/picked-row--5 \.miniapp-tarot__picked-slot \{[\s\S]*?height: 238rpx/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay[\s\S]*?\.miniapp-tarot__picked-row--5 \{[\s\S]*?max-width: 448rpx/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay[\s\S]*?\.miniapp-tarot__picked-row--5 \{[\s\S]*?gap: 20rpx/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay[\s\S]*?picked-row--5 \.miniapp-tarot__picked-slot \{[\s\S]*?width: 136rpx/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay[\s\S]*?picked-row--5 \.miniapp-tarot__picked-slot \{[\s\S]*?height: 212rpx/)
  })

  it('scales single-card spreads up and wires the result share to friend invitations', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const readingStage = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotReadingStage.tsx'), 'utf8')
    const flowSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFlow.tsx'), 'utf8')
    const tarotPageSource = fs.readFileSync(path.resolve(__dirname, '../../pages/tarot/index.tsx'), 'utf8')

    // single-card spreads get clearly larger slots and fan cards
    expect(styles).toMatch(/picked-row--1 \.miniapp-tarot__picked-slot \{[\s\S]*?width: 176rpx/)
    expect(styles).toMatch(/picked-row--1 \.miniapp-tarot__picked-slot \{[\s\S]*?height: 276rpx/)
    expect(styles).toMatch(/fan--1 \.miniapp-tarot__fan-card \{[\s\S]*?width: 140rpx/)

    // 解读页用微信转发给好友，不再复制文案
    expect(readingStage).toContain('openType="share"')
    expect(readingStage).toContain('分享给好友')
    expect(readingStage).not.toContain('复制解读文案')
    expect(readingStage).not.toContain('绑定好友后可分享')
    // the flow registers a tarot-flavored share title while the reading shows
    expect(flowSource).toContain('buildTarotShareTitle')
    expect(flowSource).toContain('onShareTitleChange')
    // the page-level share handler prefers the tarot title over the default one
    expect(tarotPageSource).toContain('tarotShareTitle')
    expect(tarotPageSource).toMatch(/if \(tarotShareTitle\)/)
  })

  it('hides the custom tab bar while the tarot flow is visible', () => {
    const tarotPageSource = fs.readFileSync(path.resolve(__dirname, '../../pages/tarot/index.tsx'), 'utf8')
    const tabBarSource = fs.readFileSync(path.resolve(__dirname, '../../custom-tab-bar/index.tsx'), 'utf8')
    const tabBarVisibility = fs.readFileSync(path.resolve(__dirname, '../../custom-tab-bar/tabBarVisibility.ts'), 'utf8')
    const tabBarStyles = fs.readFileSync(path.resolve(__dirname, '../../custom-tab-bar/index.scss'), 'utf8')

    expect(tarotPageSource).not.toContain('Taro.hideTabBar')
    expect(tarotPageSource).not.toContain('Taro.showTabBar')
    expect(tabBarSource).toContain('shouldHideCustomTabBar')
    expect(tabBarVisibility).toContain("pages/tarot/index")
    expect(tabBarSource).toContain('tabbar--hidden')
    expect(tabBarStyles).toContain('.tabbar--hidden')
    expect(tabBarStyles).toContain('display: none')
  })

  it('lets a stored reading open into the same reading body as the live result', () => {
    const historyPanel = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotHistoryPanel.tsx'), 'utf8')
    const readingBody = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotReadingBody.tsx'), 'utf8')
    const readingStage = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotReadingStage.tsx'), 'utf8')
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(historyPanel).toContain('setSelected(item)')
    expect(historyPanel).toContain('MiniappTarotReadingBody')
    expect(historyPanel).toContain('返回记录')
    expect(historyPanel).toContain('查看详情')
    expect(historyPanel).toContain('miniapp-tarot-history__list')
    expect(readingStage).toContain('MiniappTarotReadingBody')
    expect(readingBody).toContain('核心结论')
    expect(readingBody).toContain('牌阵之间的关系')
    expect(readingBody).toContain('未来 24 小时')
    expect(styles).toContain('.miniapp-tarot-history__item-more')
    expect(styles).toContain('.miniapp-tarot-history__scroll')
    expect(styles).toMatch(/\.miniapp-tarot-history__list\s*\{[^}]*gap:\s*24rpx/)
  })

  it('wires ritual haptics through the shared service instead of calling wx directly', () => {
    const flowSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFlow.tsx'), 'utf8')
    const shuffleStage = fs.readFileSync(shuffleStagePath, 'utf8')

    expect(flowSource).toContain("from '../../services/haptics'")
    expect(flowSource).toContain("impactFeedback('medium')")
    expect(flowSource).toContain("impactFeedback('heavy')")
    expect(flowSource).toContain('longFeedback()')
    expect(flowSource).not.toContain('vibrateShort')
    expect(shuffleStage).toContain('startPulseHaptics()')
    expect(shuffleStage).toContain('stopPulseHaptics()')
    expect(shuffleStage).toContain("impactFeedback('heavy')")
  })

  it('draws a layered clay candle flame as a CSS overlay anchored on the wick, not baked into the artwork', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const flowSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFlow.tsx'), 'utf8')

    // 只有 clay 牌桌挂火焰层：背景图里的蜡烛已画成未点燃
    expect(flowSource).toContain("skin === 'clay'")
    expect(flowSource).toContain('miniapp-tarot__flame-scene')
    expect(flowSource).toContain('miniapp-tarot__flame-body')
    expect(flowSource).toContain('miniapp-tarot__flame-core')
    expect(flowSource).toContain('miniapp-tarot__flame-ember')
    // 覆盖层按背景图比例定位：宽度复刻 aspectFill 的 cover 宽（竖屏 = 56.26vh，图比例 0.5626）
    expect(styles).toMatch(/\.miniapp-tarot__flame-scene \{[\s\S]*?max\(100vw, 56\.26vh\)/)
    // 火焰锚在 sanctuary-background-clay-v2.jpg（背景 2）上量得的烛芯比例坐标
    expect(styles).toMatch(/\.miniapp-tarot__flame \{[\s\S]*?left: 63\.4%/)
    expect(styles).toMatch(/\.miniapp-tarot__flame \{[\s\S]*?top: 47\.2%/)
    // 水滴形火苗：clip-path 切出尖顶肥底的真火轮廓——整朵火只有一个形体，
    // 焰尖不能再叠第二团（那会叠出中间的糖葫芦腰），内填径向渐变出暖色焰心
    expect(styles).toMatch(/\.miniapp-tarot__flame-body \{[\s\S]*?clip-path: polygon\(50% 0%, 63% 16%/)
    expect(styles).toMatch(/\.miniapp-tarot__flame-body \{[\s\S]*?radial-gradient\(ellipse 60% 46% at 50% 84%/)
    expect(styles).not.toContain('.miniapp-tarot__flame-body::before')
    expect(styles).not.toContain('.miniapp-tarot__flame-body::after')
    // 加粗一档：焰格外框宽从 .028 提到 .042（水滴更"胖"，读作水滴而非细线）
    expect(styles).toMatch(/\.miniapp-tarot__flame \{[\s\S]*?\* \.042\)/)
    // 玄幻灵气：焰外一圈缓慢涨落、向上轻飘的暖雾（::before，读作火气而非第二朵火）
    expect(styles).toContain('.miniapp-tarot__flame::before')
    expect(styles).toContain('@keyframes miniapp-tarot-flame-aura')
    // 暖白内芯 + 焰根蓝焰：真实蜡焰的亮芯与底部冷光
    expect(styles).toMatch(/\.miniapp-tarot__flame-core \{[\s\S]*?#fffef8/)
    expect(styles).toMatch(/\.miniapp-tarot__flame-ember \{[\s\S]*?rgba\(122, 176, 255/)
    // 多层动效：摇摆 + 焰身形状呼吸 + 内芯快闪 + 光晕/蜡面溢光呼吸（不同频率才不机械）
    expect(styles).toContain('@keyframes miniapp-tarot-flame-sway')
    expect(styles).toContain('@keyframes miniapp-tarot-flame-flicker')
    expect(styles).toContain('@keyframes miniapp-tarot-flame-core')
    expect(styles).toContain('@keyframes miniapp-tarot-flame-ember')
    expect(styles).toContain('@keyframes miniapp-tarot-flame-glow')
    expect(styles).toContain('@keyframes miniapp-tarot-flame-pool')
    // 火苗挂在纱罩之后：作为画面光源，不被纱罩压暗一层
    expect(flowSource.indexOf('miniapp-tarot__veil')).toBeLessThan(flowSource.indexOf('miniapp-tarot__flame-scene'))
  })

  it('wraps the backdrop layers in one scene node so clay can scale and lift them together', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const flowSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFlow.tsx'), 'utf8')

    // 背景/纱罩/火焰/星点同处一层：clay 整层放大+上移时四层保持同一几何
    expect(flowSource).toContain('miniapp-tarot__scene')
    expect(styles).toMatch(/\.miniapp-tarot__scene \{[\s\S]*?position: absolute/)
    // clay 把场景层底锚缩放 + 下移：桌子可见放大，同时月亮完整露出、气泡不压帽子。
    // 曾经用 s=1.16（顶出屏幕、月亮只剩一角），现为 translateY(88rpx) scale(1.08)。
    expect(styles).toMatch(/\.miniapp-tarot__scene \{[\s\S]*?transform: translateY\(88rpx\) scale\(1\.08\)/)
    expect(styles).toMatch(/\.miniapp-tarot__scene \{[\s\S]*?transform-origin: 50% 100%/)
    // 牌组上移让出底部按钮：四幕上 spacer 有余量时顶到 max-height，装不下先收缩
    expect(styles).toMatch(/\.miniapp-tarot__stage--shuffle > \.miniapp-tarot__spacer--top,[\s\S]*?max-height: calc\(40vh - 200rpx\)/)
    expect(styles).toMatch(/\.miniapp-tarot__fit \{[\s\S]*?scale\(var\(--tarot-stage-scale, 1\)\)/)
  })

  it('lifts only the top half on the swapped (odd) cut, so both halves never fly together', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // 起牌位移那条必须带 :not(--swapped) 守卫：在 .skin-clay 里它的权重 (0,4,0)
    // 压过基类用来复位 right 半叠的 (0,3,0)，否则奇数刀两叠同时起飞＝「整个牌一起动」
    expect(styles).toContain('.miniapp-tarot__cut-deck--cutting:not(.miniapp-tarot__cut-deck--swapped) .miniapp-tarot__cut-half--right')
    expect(styles).toMatch(/\.miniapp-tarot__cut-deck--swapped\.miniapp-tarot__cut-deck--cutting \.miniapp-tarot__cut-half--left \{[\s\S]*?translate\(117rpx, -66rpx\)/)
    // 基类仍保留「交换后把 right 复位成下压」的规则，供上面的 :not 守卫配合
    expect(styles).toMatch(/\.miniapp-tarot__cut-deck--swapped\.miniapp-tarot__cut-deck--cutting \.miniapp-tarot__cut-half--right \{[\s\S]*?translateY\(4rpx\)/)
  })

  it('floats the clay bubble above the cat and clear of the wechat capsule', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const flowSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFlow.tsx'), 'utf8')

    // 气泡钉住底边（fixed + bottom），箭头不随字数下移
    expect(styles).toMatch(/\.miniapp-tarot__stage--ritual > \.miniapp-tarot__title,[\s\S]*?position: fixed;[\s\S]*?top: auto;[\s\S]*?bottom: 79\.7vh;/)
    // 向左侧延展：左对齐 + 限宽，右端停在微信三点胶囊左侧
    expect(styles).toMatch(/\.miniapp-tarot__stage--ritual > \.miniapp-tarot__title,[\s\S]*?left: 124rpx;[\s\S]*?max-width: 400rpx;/)
    // 气泡 fixed 不参与阶段布局，故阶段用 padding-top 补回它原来的流内高度
    expect(styles).toMatch(/\.miniapp-tarot__stage--ritual,[\s\S]*?padding-top: 190rpx;[\s\S]*?overflow: hidden;/)
    // Flow 在 clay 的四仪式阶段挂状态类，CSS 借它藏掉 header 的牌阵名（visibility 保占位）
    expect(flowSource).toContain('clayRitual')
    expect(flowSource).toMatch(/state\.stage === 'shuffle'[\s\S]*?state\.stage === 'reveal'/)
    expect(flowSource).toContain('miniapp-tarot--clay-ritual')
    expect(styles).toMatch(/&\.miniapp-tarot--clay-ritual \.miniapp-tarot__header-title \{\s*\n\s*visibility: hidden;/)
  })

  it('keeps the clay moon in frame and the flying card inside the picked slot (clay-only)', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // 月亮/星云区完整露出：底锚放大 s=1.16 会把顶部顶出屏幕（月亮只剩一角），
    // 收成 scale(1.08) + translateY(88rpx) 后月亮顶回到视口内、气泡也不压帽子。
    expect(styles).toMatch(/\.miniapp-tarot__scene \{[\s\S]*?transform: translateY\(88rpx\) scale\(1\.08\)/)
    expect(styles).not.toMatch(/\.miniapp-tarot__scene \{[\s\S]*?transform: scale\(1\.16\)/)

    // 飞牌抬升量改走 --fly-y（默认 -390rpx 保持 classic 原样），clay 覆盖成 -284rpx，
    // 让牌落进已选槽而不是冲过槽位、也不蹭到水晶球
    expect(styles).toContain('var(--fly-y, -390rpx)')
    expect(styles).toMatch(/\.miniapp-tarot__fan \{[\s\S]*?--fly-y: -284rpx;[\s\S]*?--fly-y-mid: -218rpx;/)
    // 关键帧两个节点各用独立变量、默认值就是 classic 原值（-300rpx / -390rpx），
    // classic 不设变量时算出来与改动前完全一致（不用比例换算，避免 classic 被挪动）
    expect(styles).toMatch(/translateY\(var\(--fly-y-mid, -300rpx\)\)/)
    expect(styles).toMatch(/translateY\(var\(--fly-y, -390rpx\)\) rotate\(0deg\) scale\(var\(--fly-scale-end, 1\)\)/)

    // 翻牌阶段的牌位上移改由统一的上 spacer（calc(40vh - 200rpx)）达成，不再单独位移；
    // 这里只确认短屏媒体查询给了压矮兜底（牌组 + 按钮同时收得进 SE）
    expect(styles).toMatch(/\.miniapp-tarot__stage--fan-5 > \.miniapp-tarot__spacer--top,[\s\S]*?\.miniapp-tarot__stage--reveal-5 > \.miniapp-tarot__spacer--top \{[\s\S]*?max-height: calc\(18vh - 80rpx\)/)
  })

  it('bleeds clay card backs to crop the baked-in white frame', () => {
    for (const fileName of cardBackStagePaths) {
      const source = fs.readFileSync(path.resolve(__dirname, fileName), 'utf8')
      expect(source).toMatch(/className=\{skin === 'clay' \? 'miniapp-tarot__card-back-art' : undefined\}/)
      expect(source).toMatch(/getTarotCardBack\(skin\)[\s\S]*?mode="aspectFill"/)
    }

    const cardSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotCard.tsx'), 'utf8')
    expect(cardSource).toContain('getTarotArtworkUrl(drawn.card.id, skin)')
    expect(cardSource).toMatch(/getTarotArtworkUrl\(drawn\.card\.id, skin\)[\s\S]*?mode="aspectFill"/)
  })

  it('keeps clay card groups and actions on one compact spacing rhythm', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay \{[\s\S]*?--tarot-card-back-gap: 16rpx;/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay \{[\s\S]*?--tarot-picked-gap: 14rpx;/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay \{[\s\S]*?--fly-scale-end: \.86;/)
    expect(styles).toMatch(/\.miniapp-tarot__picked-row--1 \.miniapp-tarot__picked-slot \{[\s\S]*?height: 264rpx;/)
    expect(styles).toMatch(/@keyframes miniapp-tarot-card-flight[\s\S]*?translateY\(var\(--fly-y, -390rpx\)\) rotate\(0deg\) scale\(var\(--fly-scale-end, 1\)\)/)
    expect(styles).toMatch(/\.miniapp-tarot__next,[\s\S]*?flex: none;/)
    expect(styles).toMatch(/\.miniapp-tarot__fan \{[\s\S]*?margin: 0;/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay[\s\S]*?\.miniapp-tarot__hint,[\s\S]*?\.miniapp-tarot__next,[\s\S]*?\.miniapp-tarot__text-action \{[\s\S]*?margin-top: 0;/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay[\s\S]*?\.miniapp-tarot__stage--ritual > \.miniapp-tarot__spacer:not\(\.miniapp-tarot__spacer--top\),[\s\S]*?display: none;/)
    expect(styles).toMatch(/\.miniapp-tarot__fan \{[\s\S]*?gap: var\(--tarot-picked-gap\)/)
    expect(styles).not.toMatch(/\.miniapp-tarot__deck-card \{\s*\n\s*position: absolute;\s*\n\s*box-sizing: border-box;/)
    expect(styles).not.toMatch(/\.miniapp-tarot__fan-card \{\s*\n\s*position: absolute;\s*\n\s*box-sizing: border-box;/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay[\s\S]*?\.miniapp-tarot__deck-card,[\s\S]*?\.miniapp-tarot__fan-card,[\s\S]*?\.miniapp-tarot__cut-face,[\s\S]*?\.miniapp-tarot-card__face \{[\s\S]*?box-sizing: border-box;[\s\S]*?box-shadow: none;/)
    expect(styles).toMatch(/\.miniapp-tarot__card-back-art \{[\s\S]*?width: 136%;[\s\S]*?height: 136%;/)
  })

  it('keeps classic flight midpoint scale while clay opts into a smaller endpoint', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(styles).toMatch(/translateY\(var\(--fly-y-mid, -300rpx\)\) rotate\(0deg\) scale\(var\(--fly-scale-mid, 1\.18\)\)/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay \{[\s\S]*?--fly-scale-mid: 1\.08;/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay \{[\s\S]*?--fly-scale-end: \.86;/)
  })

  it('sizes clay ritual containers to their visible piles without changing classic geometry', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(styles).toMatch(/\.miniapp-tarot__shuffle-deck,\s*\n\.miniapp-tarot__cut-deck \{[\s\S]*?height: 392rpx;/)
    expect(styles).toMatch(/\.miniapp-tarot__shuffle-deck \{\s*\n\s*height: 430rpx;/)
    expect(styles).toMatch(/\.miniapp-tarot__fan-card \{[\s\S]*?bottom: 20rpx;/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay[\s\S]*?\.miniapp-tarot__shuffle-deck \{[\s\S]*?height: 410rpx;/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay[\s\S]*?\.miniapp-tarot__cut-deck \{[\s\S]*?height: 368rpx;/)
    expect(styles).toMatch(/\.miniapp-tarot\.skin-clay[\s\S]*?\.miniapp-tarot__fan-card \{[\s\S]*?bottom: 32rpx;/)
    expect(styles).toMatch(/@media \(max-height: 720px\)[\s\S]*?\.miniapp-tarot__shuffle-deck,[\s\S]*?\.miniapp-tarot__cut-deck \{[\s\S]*?height: 300rpx;/)
    expect(styles).toMatch(/@media \(max-height: 720px\)[\s\S]*?picked-row--5 \.miniapp-tarot__picked-slot \{[\s\S]*?width: 104rpx;[\s\S]*?height: 162rpx;/)
  })
})
