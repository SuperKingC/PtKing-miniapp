# 工作记录

- 时间：2026-09-09 17:40
- 原因：参考图阴影是栅格柔光。
- 修改：新增包内 `src/assets/illus/shadow-slab-v1.png`（约 19KB）。

- 时间：2026-09-09 17:30
- 原因：全局卡片投影仍偏淡。
- 修改：`--shadow-card` 加深并加 spread，让测试/记录卡也略浮起来。

- 时间：2026-09-09 17:20
- 原因：卡片投影太淡，且 overflow:hidden 会裁掉。
- 修改：`--shadow-card` 改为宽软暖棕投影。

- 时间：2026-09-09 17:05
- 原因：图标改从 ui-4 原图裁切，保留阴影。
- 修改：列表 `icon-me-*-v5.png`；底栏 `*-v8.png`。品牌栏仍 `me-banner-v4.jpg`。

- 时间：2026-09-09 17:00
- 原因：全包插画改 ui-4 软陶毡面。
- 修改：品牌栏 `me-banner-v4.jpg`（字画进图）；底栏八枚 `*-v7.png`；测试/记录插画升 v2。

- 时间：2026-09-09 16:35
- 原因：今日入口「去测」改成「测测」。
- 修改：`pages/test/index.tsx` 按钮文案；`experienceFlow.test.ts` 锁定。

- 时间：2026-09-09 16:30
- 原因：各页顶部标题统一为测测子；深色模式标题栏与页面同色。
- 修改：全部 page config 标题改为「测测子」；`theme.json` 深色导航/窗口 `#191411`；`useAppTheme` / 塔罗页切页重刷导航色。

- 时间：2026-09-09 16:30
- 原因：按 ui-4 接入列表图标和米色胶囊底栏。
- 修改：`pages/me` 改 `icon-me-*-v4.png`；`custom-tab-bar` dock `#e9dfd0` 大圆角。tab 四套插画未换。

- 时间：2026-09-09 15:55
- 原因：我的页左侧图标改成和底栏同系治愈奶油扁平。
- 修改：`pages/me` 改 `icon-me-*-v3.png`。底栏图标未换。

- 时间：2026-09-09 15:15
- 原因：落地 ui-1 列表图标，底栏去掉白底。
- 修改：`pages/me` 改 `icon-me-*-v2.png`；`custom-tab-bar` 米白槽+燕麦浮岛；`theme.json` 浅色 `tabBgColor` 改为 `#f7f4ee`。tab 图标未换。

- 时间：2026-09-09 12:20
- 原因：我的页图标偏小，原生开关偏胖短。
- 修改：`pages/me` 图标 72rpx，自绘瘦长开关 100×52rpx。

- 时间：2026-09-09 12:05
- 原因：按 ui-3 给「我的」页入口和开关加图标。
- 修改：`pages/me` 接入 6 枚 `icon-me-*-v1.png`。

- 时间：2026-09-09 11:20
- 原因：还原答题立即切题；报告「更多可以试的事」从 1 编号。
- 修改：去掉 `PLAY_CONFIRM_MS`；`test-report` 行动项改为 `index + 1`。

- 时间：2026-09-09 11:20
- 原因：8 处表现优化。
- 修改：今日入口直达一支测试；答题选中后停 280ms；报告默认展开完整解读并收底栏；全局按压态；暗色轨道/插画变量；记录分类色条；详情封面；分享卡分类色块。

- 时间：2026-09-08 19:22
- 原因：测测子栏月亮和猫要略靠下。
- 修改：`pages/me/index.scss` 底图裁切上移。

- 时间：2026-09-08 19:06
- 原因：我的页底部空白和测测子栏过高。
- 修改：`pages/me/index.scss` 底边距改为 32rpx，品牌卡 300rpx。

- 时间：2026-09-08 19:00
- 原因：测测子栏按参考重生，页脚不再裁切。
- 修改：`pages/me` 换 v3 底图、卡更高、去掉本机说明、版本右对齐、底边距加大。

- 时间：2026-09-08 18:50
- 原因：测测子栏铺满插画，版本号移到页脚。
- 修改：`pages/me` 品牌卡改铺满底图+左侧白字；页脚展示版本；资产 `me-banner-v2.jpg`。

- 时间：2026-09-08 18:40
- 原因：测测子栏先出铺满插画设计稿，不改代码。
- 修改：无代码改动。设计稿在仓库 `art/generated-art/me-banner-ui/`。

- 时间：2026-09-08 18:11
- 原因：测试未选中改用 `review-test-idle-c.png`，不是同名 jpg。
- 修改：`app.config.ts` / `custom-tab-bar` 引用 `test-v6.png`。

- 时间：2026-09-08 18:10
- 原因：塔罗解读记录要点进详情；仪式节点补震动。
- 修改：历史面板可打开完整解读；haptics 增加脉冲/强度/长震；洗牌长按连续震，抽牌/切牌/翻牌/出解读接入触感。

- 时间：2026-09-08 17:56
- 原因：测试未选中换探头猫构图并升文件名。
- 修改：`app.config.ts` / `custom-tab-bar` 引用 `test-v5.png`；记录图标未换。

- 时间：2026-09-08 17:00
- 原因：tab 文字不变、icon 稍大；塔罗/记录重生图升 v5。
- 修改文件：`custom-tab-bar` 图标 72rpx，`app.config.ts` 与资源引用 `tarot-v5`/`records-v5`。

- 时间：2026-09-08 15:55
- 原因：tab item 加大、白栏再高。
- 修改文件：`custom-tab-bar/index.scss` 图标 64rpx、文字 24rpx、min-height 160rpx；三页底边距 220rpx。

- 时间：2026-09-08 15:52
- 原因：底部白栏加高。
- 修改文件：`custom-tab-bar/index.scss` min-height 120rpx，测试/记录/我的底边距 180rpx。

- 时间：2026-09-08 15:45
- 原因：还原 tab 图标文字；点 tab 仍无反应，给官方宿主补高度并改走 `wx.switchTab`。
- 修改文件：`app.scss`、`custom-tab-bar`、`services/wxGlobal.ts`、相关测试。

- 时间：2026-09-08 15:30
- 原因：点 tab 无反应；真机塔罗因构建未读 `.asset-base-url` 走了占位域名；图标加大。
- 修改文件：`custom-tab-bar`、`config/index.ts`、测试/记录/我的底边距、相关测试。

- 时间：2026-09-08 15:20
- 原因：占位 COS 400、点 tab 不跳转、白底再降 10rpx。
- 修改文件：`services/assetBaseUrl.ts`/`dynamicTests.ts`、`custom-tab-bar`、测试/记录/我的底边距、`config/experienceFlow.test.ts`。

- 时间：2026-09-08 15:02
- 原因：白底略降且不透明；点 tab 整栏闪隐。
- 修改文件：`custom-tab-bar/index.tsx`/`index.scss`，测试/记录/我的底边距。

- 时间：2026-09-08 14:42
- 原因：白条下面空出一块——安全区被做成透明。
- 修改文件：`custom-tab-bar` 去掉透明垫层，白底铺到屏幕底并居中。

- 时间：2026-09-08 14:38
- 原因：白底再压低，图标仍在白条里居中。
- 修改文件：`custom-tab-bar`、测试/记录/我的底边距、`config/experienceFlow.test.ts`。

- 时间：2026-09-08 14:35
- 原因：降高后图标沉底。官方槽高度不变，只收内容会把图标挤下去。
- 修改文件：`custom-tab-bar/index.tsx`/`index.scss`、`theme.json`、相关测试。

- 时间：2026-09-08 14:30
- 原因：tab 白底降一点，内容区仍居中。
- 修改文件：`custom-tab-bar/index.scss`，测试/记录/我的底边距，`config/experienceFlow.test.ts`。

- 时间：2026-09-08 14:24
- 原因：tab 图标仍贴顶，安全区空白在下面。
- 修改文件：`custom-tab-bar/index.scss`、`config/experienceFlow.test.ts`。

- 时间：2026-09-08 14:16
- 原因：去掉测试卡介绍并还原图标；tab item 在现有栏高里居中。
- 修改文件：`pages/test/index.tsx`/`index.scss`、`custom-tab-bar/index.scss`、`config/experienceFlow.test.ts`。

- 时间：2026-09-08 12:45
- 原因：按截图收口隐私排版、雷达标注、测试卡图标、tab 高度/闪屏/选中态、报告底空白。
- 修改文件：`pages/privacy`、`pages/test-report`、`pages/test/index.scss`、`pages/me/index.scss`、`pages/records/index.scss`、`custom-tab-bar`、`domain/testEngine.ts`、`services/theme.ts`、`app.config.ts`、`assets/tabbar/*-v4.png`。

- 时间：2026-09-08 11:40
- 原因：底部 tab 图标和文字再大一点。
- 修改文件：`custom-tab-bar/index.scss`，以及测试/记录/我的页底边距。

- 时间：2026-09-08 11:35
- 原因：详情注意文案、去掉无用符合度栏、左右间距对齐。
- 修改文件：`pages/test-detail`、`pages/test-report`、`app.scss`、`pages/privacy/index.tsx`、`config/testFlow.test.ts`、`config/experienceFlow.test.ts`。

- 时间：2026-09-08 11:25
- 原因：今日入口略增高、右侧图略缩小；tab 图标重生为 v3 插画。
- 修改文件：`pages/test/index.scss`、`custom-tab-bar/index.tsx`/`index.scss`、`app.config.ts`、`config/appConfig.test.ts`、`assets/tabbar/*-v3.png`。

- 时间：2026-09-08 10:48
- 原因：收口今日入口高度与图标、我的页设置交互，并校准隐私文案。
- 修改文件：`pages/test/index.scss`、`pages/me/index.tsx`/`index.scss`、`pages/privacy/index.tsx`、`services/theme.ts`/`theme.test.ts`、`hooks/useAppTheme.ts`、`config/shareWiring.test.ts`、`services/motionPreference.test.ts`。

- 时间：2026-09-08 10:26
- 原因：按截图收口首页今日入口、报告底栏和我的页入口，并锁隐私页 View 导入。
- 修改文件：`pages/test/index.tsx`/`index.scss`、`pages/test-report/index.tsx`/`index.scss`、`pages/me/index.tsx`、`config/shareWiring.test.ts`、`config/testFlow.test.ts`。

- 时间：2026-09-08 10:01
- 原因：收口 tsc 剩余错误。
- 修改文件：`services/testRecords.ts`、`services/testRecords.test.ts`、`features/tarot/MiniappTarotFlow.tsx`、`MiniappTarotFanStage.tsx`、`tarotAssets.test.ts`。

- 时间：2026-09-08 09:50
- 原因：全库文案精修、分享卡片分类语气、漏斗补全；塔罗资源未就绪不准进。
- 修改文件：`domain/contentQuality.ts`、`domain/shareCopy.ts`、若干 `domain/tests/*`、`pages/test-detail`、`pages/test-play`、`pages/test-report`、`services/reportShareCard.ts`、`services/monitor.ts`、塔罗流程/牌阵/解读/历史文案。

- 时间：2026-09-07 14:28
- 原因：为答题草稿保存恢复先补充服务层聚焦测试。
- 修改文件：`miniapp/src/services/testDrafts.test.ts`，新增草稿往返、内容签名错配、有效期、答案索引校验、存储异常静默与完成清理测试。

- 时间：2026-09-07 15:08
- 原因：落地答题草稿服务、首页动态题库刷新、报告雷达唯一 ID 与塔罗失败退出。
- 修改文件：`miniapp/src/services/testDrafts.ts` 新增草稿签名/过期/续答弹窗；`miniapp/src/pages/test-play/index.tsx` 逐题保存、完成后清理、进度按当前题号；`miniapp/src/pages/test/index.tsx` 订阅注册表刷新；`miniapp/src/pages/test-report/index.tsx` 雷达画布拆成 factor/archetype 两个 ID；`miniapp/src/features/tarot/MiniappTarotFlow.tsx` 与 scss 增加失败态退出；`miniapp/src/services/wxGlobal.ts` 补充 showModal。

- 时间：2026-09-07 15:50
- 原因：落地测测子品牌与剩余体验优化。
- 修改文件：`miniapp/src/services/brand.ts`、首页续答/推荐、详情免责、报告折叠、答题动效、隐私入口、暗色 TabBar 滤镜。

- 时间：2026-09-07 16:05
- 原因：继续完善记录刷新、解锁出口、搜索、切牌跳过与离开提示。
- 修改文件：`pages/records`、`pages/test-detail`、`pages/test-report`、`pages/test`、`pages/test-play`、`features/tarot` 切牌跳过、`services/testDrafts.ts` 离开提示。

- 时间：2026-09-07 16:24
- 原因：继续优化推荐、搜索清空、塔罗加载超时与续答入口。
- 修改文件：`services/testDiscovery.ts`、`services/haptics.ts`、`pages/test`、`pages/records`、`pages/me`、`pages/test-play`、`pages/test-detail`、`features/tarot/tarotAssets.ts`、`MiniappTarotFlow.tsx`、`MiniappTarotShuffleStage.tsx`、`wxGlobal.ts`。

- 时间：2026-09-07 16:45
- 原因：将体验分支合入 main，保留暗色 TabBar 提亮与塔罗页卸栏。
- 修改文件：`custom-tab-bar/index.scss` 同时保留 `--hidden` 与暗色图标 filter。

