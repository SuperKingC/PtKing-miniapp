# 测测子塔罗布局与资源修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 clay 塔罗流程切换到用户确认的背景 2 与牌背 1，统一所有阶段的完整牌背显示、B 间距和飞牌落槽尺寸，同时保持 classic 与领域逻辑不变。

**Architecture:** 资源版本由 `tarotAssets` 统一生成，预加载与缓存继续复用现有服务；生成脚本只负责把已选 kit 候选图压缩到 COS 资产目录。UI 组件继续只渲染状态，仪式布局由 `MiniappTarotFlow.scss` 的 clay 覆盖集中控制，飞牌仅通过现有 CSS 自定义属性调整。

**Tech Stack:** Taro 4、React 18、WXSS/SCSS、Vitest、Python Pillow（资产归一化）、COS 版本化资产发布脚本。

---

## 文件变更总览

- Modify: `miniapp/src/features/tarot/tarotAssets.ts` — clay UI 资源后缀升版，majors 牌面后缀保持不变。
- Modify: `miniapp/src/features/tarot/tarotAssets.test.ts` — 锁定 classic 原 URL、clay 新背景/牌背 URL 与 24 张资源清单。
- Modify: `miniapp/src/features/tarot/MiniappTarotShuffleStage.tsx` — 牌背图片改完整比例显示。
- Modify: `miniapp/src/features/tarot/MiniappTarotCutStage.tsx` — 牌背图片改完整比例显示。
- Modify: `miniapp/src/features/tarot/MiniappTarotFanStage.tsx` — 候选牌与已选槽牌背改完整比例显示，保留现有交互和飞牌变量。
- Modify: `miniapp/src/features/tarot/MiniappTarotCard.tsx` — 翻牌组件背面改完整比例显示，牌面保持现有 aspectFill。
- Modify: `miniapp/src/features/tarot/MiniappTarotFlow.scss` — 统一牌背容器比例、B 间距 token、clay 牌位与按钮节奏、飞牌终点缩放。
- Modify: `miniapp/src/features/tarot/MiniappTarotFlow.styles.test.ts` — 增加完整比例、间距 token、终点缩放与 flex 防压缩契约。
- Modify: `miniapp/art/ref-pages-v3/install-tarot-bg-choice.py` — 输入改为用户选定背景 2，输出为 `sanctuary-background-clay-v2.jpg`。
- Modify: `miniapp/art/tarot-cardback/prepare-cardback.py` — 输入改为 v2r1，输出为 `card-back-clay-v2.jpg`。
- Modify: `scripts/publish-assets.mjs` — 塔罗清单使用两个新版本 clay UI 文件名。
- Modify: `miniapp/src/config/assetPublish.test.ts` — 同步断言新版本 UI 文件名，仍锁定 48 张总清单。
- Modify: `docs/features/cos-assets.md` — 更新当前 clay UI 资产名、来源和版本说明。
- Generated (ignored): `art/generated-art/tarot/ui/sanctuary-background-clay-v2.jpg`、`card-back-clay-v2.jpg`。

## Task 1: 先写资源 URL 回归测试

**Files:**
- Modify: `miniapp/src/features/tarot/tarotAssets.test.ts`

- [ ] **Step 1: 把 clay 资源断言改成版本化 URL**

在现有 `suffices clay skin asset files with -clay` 测试中，将 UI 资源断言改为：

```ts
expect(getTarotCardBack('clay')).toContain('/tarot/ui/card-back-clay-v2.jpg')
expect(getTarotSanctuaryBackground('clay')).toContain('/tarot/ui/sanctuary-background-clay-v2.jpg')
expect(getTarotArtworkUrl(0, 'clay')).toContain('/tarot/cards/the-fool-clay.jpg')
```

在 24 张资源测试中，对 `urls[0]` 与 `urls[1]` 使用同样的 `-clay-v2` UI 后缀；classic 分支继续要求无后缀原名。

- [ ] **Step 2: 运行测试确认先红**

Run: `npm --prefix miniapp exec vitest --run src/features/tarot/tarotAssets.test.ts`

Expected: FAIL，失败原因是实现仍返回 `sanctuary-background-clay.jpg` / `card-back-clay.jpg`。

## Task 2: 接入新版本资源并生成压缩图片

**Files:**
- Modify: `miniapp/src/features/tarot/tarotAssets.ts`
- Modify: `miniapp/art/ref-pages-v3/install-tarot-bg-choice.py`
- Modify: `miniapp/art/tarot-cardback/prepare-cardback.py`
- Generate ignored: `art/generated-art/tarot/ui/sanctuary-background-clay-v2.jpg`, `art/generated-art/tarot/ui/card-back-clay-v2.jpg`

- [ ] **Step 1: 分离 clay UI 后缀与牌面后缀**

在 `tarotAssets.ts` 保留现有 `skinSuffix` 给 22 张牌面，并新增：

```ts
const skinUiSuffix = (skin: TarotSkin): string => (skin === 'clay' ? '-clay-v2' : '')
```

让 `getTarotSanctuaryBackground` 与 `getTarotCardBack` 使用 `skinUiSuffix`，`getTarotArtworkUrl` 继续使用 `skinSuffix`。

- [ ] **Step 2: 将背景归一化脚本改为背景 2**

把 `install-tarot-bg-choice.py` 的输入改为 `tarot-bg-long2.png`，输出改为 `sanctuary-background-clay-v2.jpg`；保留 768 宽、按源比例计算高度、Pillow LANCZOS、JPEG q88、≤180KB 检查。脚本注释同步写明“用户选定背景 2”。

- [ ] **Step 3: 将牌背归一化脚本改为 v2r1**

把 `prepare-cardback.py` 的输入改为 `tarot-clay-cardback-v2r1.png`，输出改为 `card-back-clay-v2.jpg`；保留 768 宽、按源比例计算高度、Pillow LANCZOS、JPEG q90，并在输出中打印尺寸和体积。

- [ ] **Step 4: 运行归一化脚本并确认尺寸/体积**

Run:

```powershell
python miniapp/art/ref-pages-v3/install-tarot-bg-choice.py
python miniapp/art/tarot-cardback/prepare-cardback.py
```

Expected: 两个文件写入 `art/generated-art/tarot/ui/`，尺寸分别约 `768×1365`（背景 2 的 9:16 比例）与 `768×1152`（2:3），每张 ≤180KB。

- [ ] **Step 5: 运行资源测试确认变绿**

Run: `npm --prefix miniapp exec vitest --run src/features/tarot/tarotAssets.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交资源接线与脚本变更**

```powershell
git add miniapp/src/features/tarot/tarotAssets.ts miniapp/src/features/tarot/tarotAssets.test.ts miniapp/art/ref-pages-v3/install-tarot-bg-choice.py miniapp/art/tarot-cardback/prepare-cardback.py
git commit -m "接入测测子塔罗背景与牌背新资源"
```

不要 stage `art/generated-art/`，该目录已被 gitignore 管理。

## Task 3: 统一所有牌背消费者为完整显示

**Files:**
- Modify: `miniapp/src/features/tarot/MiniappTarotShuffleStage.tsx`
- Modify: `miniapp/src/features/tarot/MiniappTarotCutStage.tsx`
- Modify: `miniapp/src/features/tarot/MiniappTarotFanStage.tsx`
- Modify: `miniapp/src/features/tarot/MiniappTarotCard.tsx`
- Modify: `miniapp/src/features/tarot/MiniappTarotFlow.styles.test.ts`

- [ ] **Step 1: 先补组件契约断言**

在 `MiniappTarotFlow.styles.test.ts` 新增测试，读取四个组件源码并断言所有牌背 `<Image>` 使用 `mode="aspectFit"`，同时断言牌面 artwork 仍使用 `mode="aspectFill"`：

```ts
it('renders the same clay card back without cropping in every stage', () => {
  for (const name of ['MiniappTarotShuffleStage.tsx', 'MiniappTarotCutStage.tsx', 'MiniappTarotFanStage.tsx', 'MiniappTarotCard.tsx']) {
    const source = fs.readFileSync(path.resolve(__dirname, name), 'utf8')
    expect(source).toContain('getTarotCardBack(skin)')
    expect(source).toContain('mode="aspectFit"')
  }
  const card = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotCard.tsx'), 'utf8')
  expect(card).toContain('getTarotArtworkUrl(drawn.card.id, skin)')
  expect(card).toContain('mode="aspectFill"')
})
```

- [ ] **Step 2: 运行测试确认先红**

Run: `npm --prefix miniapp exec vitest --run src/features/tarot/MiniappTarotFlow.styles.test.ts`

Expected: FAIL，因为四个组件当前牌背仍为 `aspectFill`。

- [ ] **Step 3: 修改牌背图片模式**

仅把四个组件中指向 `getTarotCardBack(skin)` 的 `<Image>` 改成 `mode="aspectFit"`；不要修改背景图、牌面 artwork 或解读页图片的显示模式。

- [ ] **Step 4: 运行组件契约测试确认变绿**

Run: `npm --prefix miniapp exec vitest --run src/features/tarot/MiniappTarotFlow.styles.test.ts`

Expected: PASS。

## Task 4: 修正容器比例与 B 间距、飞牌尺寸

**Files:**
- Modify: `miniapp/src/features/tarot/MiniappTarotFlow.scss`
- Modify: `miniapp/src/features/tarot/MiniappTarotFlow.styles.test.ts`

- [ ] **Step 1: 先写样式契约**

在样式测试新增断言，锁定以下实现意图：

```ts
it('keeps clay card backs in a 2:3 box and uses the approved B rhythm', () => {
  const styles = fs.readFileSync(stylesPath, 'utf8')
  expect(styles).toContain('--tarot-card-back-gap: 16rpx')
  expect(styles).toMatch(/\.miniapp-tarot\.skin-clay[\s\S]*?--tarot-picked-gap: 14rpx/)
  expect(styles).toMatch(/\.miniapp-tarot__picked-row--1 \.miniapp-tarot__picked-slot \{[\s\S]*?height: 264rpx/)
  expect(styles).toMatch(/\.miniapp-tarot\.skin-clay[\s\S]*?--fly-scale-end: \.86/)
  expect(styles).toMatch(/translateY\(var\(--fly-y, -390rpx\)\)[\s\S]*?scale\(var\(--fly-scale-end, 1\)\)/)
  expect(styles).toMatch(/\.miniapp-tarot__next,[\s\S]*?flex: none;/)
})
```

- [ ] **Step 2: 运行测试确认先红**

Run: `npm --prefix miniapp exec vitest --run src/features/tarot/MiniappTarotFlow.styles.test.ts`

Expected: FAIL，因为当前没有明确间距 token、单牌 clay 槽仍被压为 `150rpx`，飞牌终点为固定 `scale(1)`。

- [ ] **Step 3: 增加统一 clay 布局 token**

在 `.miniapp-tarot.skin-clay` 中增加：

```scss
--tarot-card-back-gap: 16rpx;
--tarot-picked-gap: 14rpx;
--fly-scale-end: .86;
```

用 `--tarot-card-back-gap` 控制抽牌组与主按钮/提示文本的垂直间隔；保留按钮 `flex: none` 和当前短屏兜底。

- [ ] **Step 4: 修正牌背容器比例而不挤压按钮**

在通用牌背容器规则中保留现有宽度，补充 `box-sizing: border-box`；将 clay 单牌槽从 `176×150rpx` 改为 `176×264rpx`，短屏从 `176×130rpx` 改为 `88×132rpx`，五牌槽维持紧凑尺寸并保持约 2:3 比例。不要改 `miniapp-tarot-card` 正面解读卡尺寸。

- [ ] **Step 5: 将 B 方案间距收敛为固定节奏**

在 clay 覆盖中把 `.miniapp-tarot__fan` 的负外边距从 `-12rpx` 调整为 `0`，并为 `.miniapp-tarot__picked-row` 与 `.miniapp-tarot__fan` 使用 `gap: var(--tarot-picked-gap)`；将按钮/状态文本的上 margin 统一引用 `var(--tarot-card-back-gap)`。保持上 spacer 的现有 `calc(40vh - 200rpx)`，它负责牌组落在水晶球底座下方；不要重新引入弹性下 spacer。

- [ ] **Step 6: 修正飞牌终点大小与中段过冲**

在 `@keyframes miniapp-tarot-card-flight` 中把终点和 clay 中段改为：

```scss
55% {
  transform: translateX(calc(var(--fly-x, 0rpx) * .6)) translateY(var(--fly-y-mid, -300rpx)) rotate(0deg) scale(1.08);
}
100% {
  transform: translateX(var(--fly-x, 0rpx)) translateY(var(--fly-y, -390rpx)) rotate(0deg) scale(var(--fly-scale-end, 1));
}
```

clay 使用 `--fly-scale-end: .86`，把候选牌从约 `140×218rpx` 收到单牌槽 `~120×187rpx` 的视觉范围；五牌牌阵沿用同一比例变量，不越过槽位。classic 不设置该变量，默认 `scale(1)`，行为保持原样。

- [ ] **Step 7: 运行样式测试确认变绿**

Run: `npm --prefix miniapp exec vitest --run src/features/tarot/MiniappTarotFlow.styles.test.ts`

Expected: PASS。

- [ ] **Step 8: 提交布局与组件变更**

```powershell
git add miniapp/src/features/tarot/MiniappTarotShuffleStage.tsx miniapp/src/features/tarot/MiniappTarotCutStage.tsx miniapp/src/features/tarot/MiniappTarotFanStage.tsx miniapp/src/features/tarot/MiniappTarotCard.tsx miniapp/src/features/tarot/MiniappTarotFlow.scss miniapp/src/features/tarot/MiniappTarotFlow.styles.test.ts
git commit -m "统一测测子塔罗牌背显示与抽牌间距"
```

## Task 5: 更新 COS 清单与功能文档

**Files:**
- Modify: `scripts/publish-assets.mjs`
- Modify: `miniapp/src/config/assetPublish.test.ts`
- Modify: `docs/features/cos-assets.md`

- [ ] **Step 1: 先更新资产清单测试**

将 `assetPublish.test.ts` 中两个 clay UI 字面量改为 `sanctuary-background-clay-v2.jpg` 与 `card-back-clay-v2.jpg`，保持 48 张总数和 majors `-clay` 牌面规则。

- [ ] **Step 2: 运行测试确认先红**

Run: `npm --prefix miniapp exec vitest --run src/config/assetPublish.test.ts`

Expected: FAIL，因为发布脚本仍列旧文件名。

- [ ] **Step 3: 修改发布清单**

在 `scripts/publish-assets.mjs` 的 `TAROT_FILES` 中只替换两个 UI clay 文件名；不要改 majors 数量、classic 文件名或上传目录结构。

- [ ] **Step 4: 更新 COS 文档**

在 `docs/features/cos-assets.md` 当前文件列表中将两个 clay UI 文件替换为新版本名，并注明：背景 2 来自 `tarot-bg-long2.png`，牌背 1 来自 `tarot-clay-cardback-v2r1.png`；新版本名用于防缓存。文档中原有 48 张、COS 根和不进主包规则保持不变。

- [ ] **Step 5: 运行资产测试确认变绿**

Run: `npm --prefix miniapp exec vitest --run src/config/assetPublish.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交清单与文档**

```powershell
git add scripts/publish-assets.mjs miniapp/src/config/assetPublish.test.ts docs/features/cos-assets.md
git commit -m "更新塔罗新资源发布清单"
```

## Task 6: 全量塔罗测试与 weapp 构建

**Files:** 无新增；验证前述变更。

- [ ] **Step 1: 运行塔罗与页面聚焦测试**

Run: `npm --prefix miniapp exec vitest --run src/features/tarot src/pages/tarot`

Expected: 所有塔罗和塔罗入口测试通过，无失败与未处理错误。

- [ ] **Step 2: 运行资产清单测试**

Run: `npm --prefix miniapp exec vitest --run src/config/assetPublish.test.ts`

Expected: PASS。

- [ ] **Step 3: 构建微信小程序**

Run: `npm run build:weapp`

Expected: exit code 0；`miniapp/dist` 重新生成，构建日志无 TypeScript/WXSS 错误。

- [ ] **Step 4: 检查生成资源存在并未进主包源码**

Run:

```powershell
Get-Item art/generated-art/tarot/ui/sanctuary-background-clay-v2.jpg, art/generated-art/tarot/ui/card-back-clay-v2.jpg | Select-Object FullName,Length
rg -n "sanctuary-background-clay-v2|card-back-clay-v2" miniapp/src scripts docs/features/cos-assets.md
```

Expected: 两张生成图存在且 ≤180KB；代码只引用 URL 文件名，不出现 `miniapp/src/assets` 的复制品。

- [ ] **Step 5: 清缓存预览入口**

在微信开发者工具中导入 `D:\Mine\PtKing-miniapp\miniapp`，执行“清缓存 → 重新编译”。验收 clay：

1. 背景为背景 2 的长桌构图。
2. 洗牌、切牌、抽牌候选、已选槽、翻牌前均使用同一 v2r1 牌背，四边完整可见。
3. 限定牌在水晶球底座下约 12–16rpx；按钮/文案与牌组保持约 16rpx。
4. 抽牌飞牌落入槽位时大小与槽位匹配，不越位、不裁剪。
5. classic 仍使用旧背景、旧牌背与原动画。

注意：本任务不自动执行 COS 上传；视觉验收通过后再按项目流程运行 `npm run assets`。

## Task 7: 最终检查与任务提交

- [ ] **Step 1: 查看任务范围 diff**

Run: `git diff --stat HEAD~3..HEAD` 与 `git status --short`。

确认最近三个任务提交只包含资源接线、组件/布局、发布清单与文档；不 stage 或回退用户已有的 tabbar、测试中心、截图和其它未提交改动。

- [ ] **Step 2: 运行最终验证命令**

Run: `npm test`

Expected: 全仓 Vitest 通过；若存在与本任务无关的既有失败，记录具体测试名和输出，不声称全绿。

- [ ] **Step 3: 汇报证据**

最终回复必须列出：修改文件与提交、聚焦测试命令/结果、`npm test` 结果、`npm run build:weapp` 结果、微信开发者工具清缓存预览入口，以及尚未执行的 COS 上传/视觉验收状态。
