# 工作记录

- 时间：2026-09-08 18:10
- 原因：塔罗仪式需要连续洗牌震动和不同强度触感。
- 修改：`haptics.ts` 增加 `impactFeedback` / `longFeedback` / `startPulseHaptics` / `stopPulseHaptics`，`tapFeedback` 复用轻震；`wxGlobal.ts` 补 `vibrateLong`；`haptics.test.ts` 覆盖强度、长震、脉冲启停与关闭偏好。

- 时间：2026-09-08 15:45
- 原因：自定义 tabBar 改走原生 `wx.switchTab`。
- 修改：`wxGlobal.ts` 的 `WxLike` 补上 `switchTab`。

- 时间：2026-09-08 15:20
- 原因：占位 COS 根会请求 registry-v1.json 并 400。
- 修改：`assetBaseUrl.ts` 增加 `isUsableAssetBaseUrl`；`loadDynamicTests` 对占位域名直接跳过，不发请求。

- 时间：2026-09-08 12:45
- 原因：切 tab 时重复刷导航/窗口底色会闪一下。
- 修改：`theme.ts` 缓存已应用主题，相同主题跳过 `setNavigationBarColor` / `setBackgroundColor`。

- 时间：2026-09-08 10:48
- 原因：主题只保留浅色/深色，默认浅色；历史 auto 按 light 读。
- 修改：`theme.ts` / `theme.test.ts` 去掉跟随系统作为可选偏好；`motionPreference.test.ts` 不再要求我的页提供动效栏。
