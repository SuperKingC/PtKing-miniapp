# 工作记录

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
