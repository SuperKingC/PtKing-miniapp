# 工作记录

- 时间：2026-09-09 18:23
- 原因：投影加厚换令牌，测试同步。
- 修改：`shareWiring.test.ts` 改断言 me scss 三处 `box-shadow: var(--shadow-slab)` 且 app.scss 定义 `--shadow-slab:`；`testFlow.test.ts` 对齐我的页去 `enhanced` 的既成事实（records/test 仍要求）。

- 时间：2026-09-09 18:09
- 原因：PNG 栅格阴影翻车（不透明色块盖住卡面），回退为 CSS 投影。
- 修改：`shareWiring.test.ts` 改断言：me 页不含 `shadow-slab-v1`/`slab-shadow`/`slab`；`.me-page__icon` 带 `drop-shadow`；版本号 `justify-content/text-align: center`。

- 时间：2026-09-09 17:40
- 原因：锁定栅格毡面阴影和月亮下移裁切。
- 修改：`shareWiring.test.ts` 断言 `shadow-slab-v1.png`、banner 图高 480rpx / bottom -160rpx。

- 时间：2026-09-09 17:30
- 原因：锁定品牌栏变矮和厚毡块投影结构。
- 修改：`shareWiring.test.ts` 断言 banner 320rpx、`.me-page__slab`、ScrollView 不再 enhanced。

- 时间：2026-09-09 17:20
- 原因：锁定抠干净的 v4 图标、卡片外层投影与 clip 结构。
- 修改：`shareWiring.test.ts` 禁止 v5、断言 banner/entries/prefs clip 与 `--shadow-card`；`appConfig.test.ts` 底栏仍为 `*-v7.png`。

- 时间：2026-09-09 17:05
- 原因：锁定从 ui-4 裁切的图标文件名。
- 修改：`appConfig.test.ts` 底栏 `*-v8.png`；`shareWiring.test.ts` 列表 `icon-me-*-v5.png`。

- 时间：2026-09-09 17:00
- 原因：锁定 ui-4 全包资产文件名。
- 修改：`appConfig.test.ts` 底栏改为 `*-v7.png`；`shareWiring.test.ts` 锁定 `me-banner-v4.jpg`、禁止 CSS 叠字。

- 时间：2026-09-09 16:35
- 原因：锁定今日入口按钮为「测测」。
- 修改：`experienceFlow.test.ts` 断言 `测测 ›`，禁止 `去测 ›`。

- 时间：2026-09-09 16:30
- 原因：锁定各页导航标题为测测子，且深色标题栏与页面同色。
- 修改：`appConfig.test.ts` 断言全部 page config 标题、禁止硬编码导航色、深色 `navBgColor` 为 `#191411`。

- 时间：2026-09-09 16:30
- 原因：锁定 ui-4 图标与米色胶囊底栏。
- 修改：`shareWiring.test.ts` 改为 `icon-me-*-v4.png`；`experienceFlow.test.ts` 断言 `#e9dfd0`。

- 时间：2026-09-09 15:55
- 原因：锁定列表图标升到 v3。
- 修改：`shareWiring.test.ts` 改为 `icon-me-*-v3.png`。

- 时间：2026-09-09 15:15
- 原因：锁定 ui-1 图标文件名与底栏不再白底。
- 修改：`shareWiring.test.ts` 改为 `icon-me-*-v2.png`；`experienceFlow.test.ts` 断言米白槽/燕麦浮岛；`appConfig.test.ts` 断言 `tabBgColor === bgColor`。

- 时间：2026-09-09 12:20
- 原因：锁定我的页图标放大与自绘开关尺寸。
- 修改：`shareWiring.test.ts` 改为断言 `me-page__switch`、图标 72rpx、开关 100×52rpx。

- 时间：2026-09-09 12:05
- 原因：锁定「我的」页列表/开关图标接线。
- 修改：`shareWiring.test.ts` 要求 `icon-me-clear-v1.png`、主题/震动图标和 `me-page__icon`。

- 时间：2026-09-09 11:20
- 原因：还原答题立即切题，并锁定报告行动项从 1 编号。
- 修改：`experienceFlow.test.ts` 不再要求 `PLAY_CONFIRM_MS`；`testFlow.test.ts` 锁定 `{index + 1}`。

- 时间：2026-09-09 11:20
- 原因：锁定今日入口直达、答题确认停顿、报告默认展开、按压态和分享卡分类。
- 修改：`experienceFlow.test.ts`、`testFlow.test.ts`、`shareWiring.test.ts`。

- 时间：2026-09-08 19:22
- 原因：品牌卡底图下移一点。
- 修改：`shareWiring.test.ts` 锁定 banner 图 `top: -40rpx` / `height: 456rpx`。

- 时间：2026-09-08 19:06
- 原因：我的页去掉 tab 预留底边距，压低品牌卡。
- 修改：`shareWiring.test.ts` 锁定卡高 300rpx、页面底边距 32rpx。

- 时间：2026-09-08 19:00
- 原因：品牌卡换 v3，页脚只留右对齐版本。
- 修改：`shareWiring.test.ts` 锁定 `me-banner-v3.jpg`、卡高 456rpx、底边距 280rpx、版本右对齐，并禁止本机说明文案。

- 时间：2026-09-08 18:50
- 原因：我的页品牌卡铺满、版本进页脚。
- 修改：`shareWiring.test.ts` 锁定 `me-banner-v2.jpg`、`aspectFill`、页脚版本，并禁止品牌卡点击跳转。

- 时间：2026-09-08 18:08
- 原因：测试未选中改为 PNG 那张并升到 v6。
- 修改：`appConfig.test.ts` 锁定 `test-v6.png`。

- 时间：2026-09-08 17:56
- 原因：锁测试未选中升到 v5。
- 修改：`appConfig.test.ts` 将 `test-v4.png` 改为 `test-v5.png`。

- 时间：2026-09-08 17:00
- 原因：锁 72rpx 图标、塔罗/记录 v5。
- 修改：`experienceFlow.test.ts` 断言 72rpx；`appConfig.test.ts` 锁定 `*-v5.png`（塔罗/记录）。

- 时间：2026-09-08 15:55
- 原因：锁更大的 tab item 和更高白栏。
- 修改：`experienceFlow.test.ts` 断言 64rpx / 24rpx / `min-height: 160rpx`。

- 时间：2026-09-08 15:52
- 原因：锁更高的 tab 白栏。
- 修改：`experienceFlow.test.ts` 断言 `min-height: 120rpx`。

- 时间：2026-09-08 15:45
- 原因：还原图标文字，并锁宿主高度与 `wx.switchTab`。
- 修改：`experienceFlow.test.ts` 断言 50rpx/20rpx、`custom-tab-bar` 宿主、`switchTo`。

- 时间：2026-09-08 15:30
- 原因：锁官方槽铺满、dataset 点击、更大图标；构建必须读 `.asset-base-url`。
- 修改：`experienceFlow.test.ts`、`appConfig.test.ts`、`tabBarVisibility.test.ts`。

- 时间：2026-09-08 15:20
- 原因：锁更矮的不透明栏高，以及先 switchTab 再改选中态。
- 修改：`experienceFlow.test.ts` 断言 `78rpx + 安全区`、`catchClick`、`switchTab` 在 `setState` 之前。

- 时间：2026-09-08 15:02
- 原因：锁略矮的不透明栏高，以及切 tab 不先藏栏。
- 修改：`experienceFlow.test.ts` 断言 `88rpx + 安全区`、`handleSwitch` 不调用 `applyVisibility`。

- 时间：2026-09-08 14:42
- 原因：锁白底铺满安全区并居中。
- 修改：`experienceFlow.test.ts` 断言 `96rpx + 安全区`，不再要 `tabbar__safe`。

- 时间：2026-09-08 14:38
- 原因：锁 76rpx 白底 dock + 透明安全区。
- 修改：`experienceFlow.test.ts` 断言 `tabbar__safe` 与 `height: 76rpx`。

- 时间：2026-09-08 14:35
- 原因：锁 dock 居中，且官方 tab 槽底色跟页面底色一致。
- 修改：`experienceFlow.test.ts` 断言 `tabbar__dock`；`appConfig.test.ts` 断言 `tabBgColor === bgColor`。

- 时间：2026-09-08 14:30
- 原因：锁更矮的 tab 内容区。
- 修改：`experienceFlow.test.ts` 断言内容区 88rpx、安全区在容器底 padding。

- 时间：2026-09-08 14:24
- 原因：锁 tab item 在整条栏高里居中，不再把安全区单独垫在下面。
- 修改：`experienceFlow.test.ts` 断言 item 高度含安全区、容器无底 padding。

- 时间：2026-09-08 14:16
- 原因：锁测试卡去掉介绍、tab 内容区 102rpx 居中。
- 修改：`experienceFlow.test.ts` 断言无 `card-benefit`，tab item 高度为 102rpx。

- 时间：2026-09-08 12:45
- 原因：锁 v4 tab 图标与隐私页排版、雷达标签。
- 修改：`appConfig.test.ts` 锁定 `*-v4.png`；`experienceFlow.test.ts` 锁隐私左对齐；`testFlow.test.ts` 锁雷达 `fillText`。

- 时间：2026-09-08 11:25
- 原因：tab 图标升到 v3。
- 修改：`appConfig.test.ts` 锁定 `*-v3.png`。

- 时间：2026-09-08 10:48
- 原因：锁我的页开关交互与隐私入口。
- 修改：`shareWiring.test.ts` 断言深色/震动用 Switch，且不再出现跟随系统或动效栏。
