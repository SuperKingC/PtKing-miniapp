# 上线加固：监控埋点 / 报告广告解锁 / 隐私合规 / 设置页 / 分享卡片 / 记录增强 / 暗色模式

> 2026-09-04 落地。目标：补齐"上线产品"四类缺口——线上可观测、内容可变现、合规有页面、体验有容错与暗色适配。

## 1. 监控与错误捕获（`src/services/monitor.ts`）

无后端阶段的线上观测方案，全部走微信实时日志（`wx.getRealtimeLogManager`），后台「开发 → 运维中心 → 实时日志」可查：

- 错误搜 `[err]` 前缀；漏斗事件搜 `[evt]` 前缀；开发期同步打到 console（`[track]` / `[capture]`）。
- 全局捕获：`app.tsx` 启动时 `installGlobalErrorHandlers()` 注册 `wx.onError` / `wx.onUnhandledRejection` / `wx.onPageNotFound`。
- 关键漏斗事件：`test_detail_view` → `test_start` → `test_complete` → `report_view`（带 locked）→ `report_unlock`（带 outcome）→ `report_share`；另有 `page_not_found`、`settings_clear_records`。
- 答题页 `scoreTest` 抛错（如动态定义缺字段）不再断流程：捕获上报 + toast 提示重试（`test-play/index.tsx`）。
- 约定：monitor 内部所有 wx 调用 try/catch + getWxGlobal 守卫，日志失败绝不影响主流程。

## 2. 报告解锁变现（激励视频，`src/services/rewardedAd.ts`）

链路：答题完成 → `saveTestRecord(..., { locked: true })` → 报告页锁定态（不渲染正文）→「观看视频解锁」→ `showRewardedAd()` → `unlockRecord` 持久化解锁。

- 广告位配置：构建注入 `TARO_AD_UNIT_ID`（`config/index.ts` 读环境变量）。**留空 = 记录不落锁，报告直接展示、无解锁门**（本地开发、未开通流量主时的默认状态）；上线前在微信公众平台开通流量主、创建激励视频广告位，构建时注入 `TARO_AD_UNIT_ID=adunit-xxx`，此后新完成的报告才出现解锁门。
- 旧锁归一化：`normalizeRecordLocks`（loadTestRecords 读取侧统一执行）——广告位未配置时，历史遗留的 `locked:true` 旧记录一律视为已解锁，报告页/记录页无需各自兜底。
- 解锁门视图只有 hero 预告 + 解锁卡，**无「再测一次/回到测试中心」次级出口**（聚焦解锁动作，离开走导航返回）。
- 结果三态：`completed`（看完）/ `aborted`（中途关闭，toast 提示重看）/ `unavailable`（无广告位或 SDK 异常）。
- **降级铁律**：SDK 任何异常（创建失败、show 两次重试失败、播放中 onError）一律 `unavailable`，调用方直接解锁报告——广告故障绝不阻断看报告主链路。另有 90s 看门狗防 onClose 不回调挂死。
- 记录页对 `locked === true` 的记录展示「待解锁」徽标，点进报告页仍是解锁门。
- 契约测试：`rewardedAd.test.ts`（三态映射 + mock 广告完整/中途/双重失败/播放中出错）。

## 3. 隐私合规与设置页

- 新页面 `pages/privacy`：隐私政策与用户条款静态文案（本地存储说明、微信广告与客服的第三方说明、娱乐向免责）。入口：「我的 → 隐私政策与用户条款」。
- 数据管理直出「我的」页（原独立设置页已并入并删除）：banner 下展示版本号（`APP_VERSION`，与 package.json 同步维护），入口为 已做测试 / 清空测试记录（`showModal` 二次确认）/ 隐私政策与用户条款 / 问题反馈；塔罗数据暂无清空入口（塔罗历史入口只在塔罗页内）。
- **上线检查项（代码外）**：微信公众平台需配置《用户隐私保护指引》并声明本地存储/广告用途；客服会话需在后台配置客服人员。

## 4. 分享卡片（`src/services/reportShareCard.ts`）

- 报告页隐藏 canvas（5:4，600×480，`test-report__share-canvas` 屏外绝对定位）预生成结果卡片图：品牌暖橘渐变 + 品牌行 + 测试名 + 结果大标题（按字数自适应缩小字号）+ tagline + 底部引导。
- 转发/朋友圈分享带 `imageUrl`；任一步失败返回空串回退微信默认截图，绝不阻断分享。
- 卡片固定浅色设计（会话内深浅主题观感一致）；纯 canvas 绘制，无新增图片资产。

## 5. 记录增强（`src/services/testRecords.ts` + 记录页 + 报告页）

- `TestRecord` 扩展可选字段：`locked`（解锁状态）、`testTitle` / `resultTitle`（落库快照）。旧记录缺省时视为已解锁、走定义标题兜底。
- 记录页**不再过滤已下架测试**：标题/结果取定义、缺失回退快照——历史记录不随内容下架消失。
- 记录列表点击带 `&finishedAt=` 精确回看那一次；报告页「历史对比」面板（多测同测试时出现）：第 N 次 + 日期 + 结果 + band 模式分差（▲/▼），行可点击切换回看。
- 存储达 `TEST_RECORDS_CAP`（200）上限时记录页顶部提示条（最早记录会自动清理，可去设置清空）。

## 6. 暗色模式

- `app.config.ts`：`darkmode: true` + `themeLocation: 'theme.json'`；导航栏/tabBar 颜色全部改 `@变量`，`src/theme.json` 提供双主题（构建自动复制到 dist，已核验）。
- 页面配色：`app.scss` 在 `prefers-color-scheme: dark` 下覆盖 CSS 变量（暖深棕底 `#191411`/卡片 `#262019`，主色提亮为 `#d97549` 保对比度）；各页面少量硬编码色（首页卡片渐变、报告刻度条、注意卡等）加了暗色补丁；答题页返回钮、我的页分隔线改走变量。
- canvas 取色在 JS：报告页雷达图按 `Taro.getSystemInfoSync().theme` 初始化并监听 `onThemeChange` 重绘。
- 塔罗页本身即深色主题，不参与切换。
- **验收注意**：tabBar 图标仍是浅色系现有资产，深底下观感需真机验收；不达标时用 kit 流水线出一套暗色图标（升文件名防缓存）。

## 7. 其他修正

- 塔罗解读页按钮文案与实际行为对齐：「分享到聊天室」→「复制解读文案 / 已复制 ✓ / 复制中…」（实际是 `setClipboardData` 复制文本）。
- `wxGlobal.ts` WxLike 补充实时日志/错误监听/广告/选择器查询等可选方法签名。

## 测试与验证

- `npm run test`：22 文件 194 用例全通过（新增 `monitor.test.ts`、`rewardedAd.test.ts`；扩展 `testRecords.test.ts`、`appConfig.test.ts` 契约）。
- `npm run build:weapp` 编译通过；dist 核验：9 页面注册齐全、`darkmode/themeLocation/@变量` 正确、`theme.json` 已复制、监控/广告/分享卡片代码均在产物中。
- 未经真机预览的验收区（微信开发者工具 + 真机）：广告解锁真机拉起（需配置真实广告位）、隐私页排版、暗色模式整体观感与 tabBar 图标、分享卡片出图效果。
