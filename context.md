# 本轮工作记录

## 2026-09-14 15:29 (UTC+8)
- 原因：模拟器拉 `registry-v1.json` 404；正式 COS 同样缺文件；全量上传按 git SHA 开新目录会和已发版玩家指针错位；同名换图被 immutable + 本地 URL 缓存钉死；频道名希望跟 git tag 走。
- 修改：
  - 修好 `content/export-registry.mjs`，`art:preview` 启动先导出题库。
  - 发布流水线带上 `tests/registry-v1.json`；`assets:registry` / `assets:registry:probe` 热更题库（短缓存）；探针可验收 COS 下发。
  - `assets:hot --live` 覆盖 `.asset-base-url` 指针目录，不改指针、不重建。
  - registry 写 `assetRev`，塔罗 URL 加 `?r=`，COS 同名换图可热更；包内图清全缓存即可，升文件名不再强制。
  - `--channel` 无值时读 git tag（逻辑上收进 kit `cos/git-channel.mjs`）；`npm run assets:channel`。
- 验证：聚焦 vitest（registry/publish/assetRev/dynamicTests/tarotAssets/assetPointer）全过；COS `c958df7/tests/registry-v1.json` 曾 200（含探针，可用 `assets:registry` 撤回）。kit：`node cos/git-channel.test.mjs` 过。未 commit、未打 tag。

## 2026-09-09 17:40 (UTC+8)
- 原因：参考图立体感是画进去的毡面柔光；月亮应靠下被品牌栏裁掉一截。
- 修改：新增 `shadow-slab-v1.png` 垫在卡片/底栏后；卡面毡色+内凹光；banner 图下移裁月亮。
- 验证：`shareWiring` + `appConfig` + `experienceFlow` 共 22 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/`，清缓存后看月亮是否被品牌栏下沿裁掉、卡片四周是否有毡面柔光。未做真机点验。未 commit。

## 2026-09-09 17:30 (UTC+8)
- 原因：对照 ui-4，品牌栏过高，卡片四周仍没有厚毡块立体感。
- 修改：banner 320rpx；`.me-page__slab` 三层暖棕扩散投影；滚动 padding 改到内部容器，去掉 enhanced 以免裁阴影。底栏 dock 同步加厚。
- 验证：`shareWiring` + `appConfig` + `experienceFlow` 共 22 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/`，清缓存后看「我的」品牌栏是否变矮、三块卡和底栏四周是否有厚毡块投影。未做真机点验。未 commit。

## 2026-09-09 17:20 (UTC+8)
- 原因：图一米色方底是从 ui-4 整页裁切带了卡底；用户要的阴影是每块卡片周围的宽软投影，不是图标脚下。
- 修改：列表改回透明底 `icon-me-*-v4.png`，底栏改回 `*-v7.png`。`AGENTS.md` / `miniapp-kit.md` 纠正为白底泛洪抠图标、卡片用 CSS `--shadow-card`。品牌栏/列表/开关卡外层投影内层裁圆角；底栏胶囊同样用宽软投影。
- 验证：`shareWiring` + `appConfig` + `experienceFlow` 共 22 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/`，清缓存后看「我的」三块卡和底栏胶囊是否浮起来、列表图标是否无米色方底。未做真机点验。未 commit。

## 2026-09-09 17:05 (UTC+8)
- 原因：用户觉得当前图标没有 ui-4 质感，缺阴影，要求直接从 ui-4 抠。
- 修改：列表 `icon-me-*-v5.png`、底栏 `*-v8.png` 均从 `ui-4.png` 裁切并保留软投影，不再泛洪抠白底。
- 验证：`shareWiring` + `appConfig` 共 16 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/`，清缓存后看「我的」列表图标和底栏是否带 ui-4 那层软投影。未做真机点验。品牌栏仍用 `me-banner-v4.jpg`。

## 2026-09-09 17:00 (UTC+8)
- 原因：用户选定 heal-preview ui-4，要把「我的」、底栏和其它插画都换成这套软陶毡面；测测子栏文字画进图。
- 修改：风格写入 `AGENTS.md`、`docs/features/miniapp-kit.md`、`art.config.json` 的 `style` 与 `art/prompts.txt`。品牌栏换成 `me-banner-v4.jpg`（字在图里，去掉 CSS 叠字）。底栏八枚换成 `*-v7.png`。测试中心 hero/分类点/记录空态升到 v2。列表图标沿用已接的 `icon-me-*-v4.png`。
- 验证：`shareWiring` + `appConfig` + `experienceFlow` 共 22 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/`，清缓存后看「我的」品牌栏是否自带「测测子」字、底栏四枚是否为软陶探头猫/扇形牌/爪印本/坐姿猫、测试中心和记录空态是否同一套。未做真机点验。COS 热更未传。塔罗 COS 题图未改。

## 2026-09-09 16:36 (UTC+8)
- 原因：今日入口按钮要更像品牌语气。
- 修改：`pages/test/index.tsx`「去测 ›」改为「测测 ›」；`experienceFlow.test.ts` 锁定。
- 验证：`experienceFlow.test.ts` 6 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/`，清缓存后看测试中心今日入口按钮是否为「测测 ›」。未做真机点验。记录页空态「去测 xxx」、报告页「去测试中心」未改。

## 2026-09-09 16:35 (UTC+8)
- 原因：用户选定 heal-preview ui-4。
- 修改：6 枚 `icon-me-*-v4.png` 落包；底栏改米色胶囊（`#e9dfd0`、更大圆角、两侧留空）。tab 四套插画未换。
- 验证：`shareWiring` + `experienceFlow` 共 12 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/`，清缓存后看「我的」页左侧软陶图标，以及底栏米色胶囊（两侧留空）。未做真机点验。tab 四套插画未换。

## 2026-09-09 16:30 (UTC+8)
- 原因：各页顶部标题不统一；切深色后标题栏颜色不跟。
- 修改：8 个 page config 标题改为「测测子」；深色导航栏改为 `#191411`；切页 force 重刷 `setNavigationBarColor`。
- 验证：`theme.test.ts` + `appConfig.test.ts` 共 17 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/`，清缓存后看四 tab 与子页顶栏是否都是「测测子」；在「我的」开深色后顶栏是否跟页面同为暖深棕，再切测试/记录/塔罗顶栏是否仍是深色。未做真机点验。底栏文案、塔罗流程配色、分享标题未改。

## 2026-09-09 16:14 (UTC+8)
- 原因：左侧图标不好看，要先出几版预览再接线；底栏背景同样先预览。
- 修改：`art:ui` 出 `art/generated-art/me-heal-preview-ui/ui-1.png`～`ui-5.png`。未改小程序代码，未换现有 `icon-me-*-v3.png`。
- 验证：未改页面，无需构建。请看这 5 张选列表图标和底栏背景。未做真机点验。

## 2026-09-09 15:55 (UTC+8)
- 原因：我的页左侧图标要治愈风，并和底栏插画同一套。
- 修改：6 枚 `icon-me-*-v3.png` 落包；`pages/me` 引用 v3。底栏四套图标未换。
- 验证：`shareWiring.test.ts` 6 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/`，清缓存后看「我的」页左侧图标是否和底栏探头猫/本子同一套治愈奶油扁平。未做真机点验。底栏四套图标未换。

## 2026-09-09 15:15 (UTC+8)
- 原因：用 ui-1 列表图标，同时换掉底栏白底；tab 图标不改。
- 修改：6 枚 `icon-me-*-v2.png` 落包；`pages/me` 引用 v2；底栏槽底跟页面米白，中间燕麦圆角浮岛。`theme.json` 浅色 tab 底改为 `#f7f4ee`。
- 验证：`shareWiring` + `experienceFlow` + `appConfig` 共 21 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/`，清缓存后看「我的」页左侧手绘图标，以及四 tab 底栏是否不再是白条。未做真机点验。tab 四套插画图标未换。

## 2026-09-09 14:53 (UTC+8)
- 原因：用户要看提示词，并纠正：不改 tab 图标；列表风格不要原本扁平色块。
- 修改：改正后 `art:ui` 出 `art/generated-art/me-newstyle-keep-tabicons-ui/ui-1.png`～`ui-5.png`。未改小程序代码。
- 验证：未改页面，无需构建。请看这 5 张。未做真机点验。

## 2026-09-09 14:36 (UTC+8)
- 原因：按原本奶油扁平风重设计「我的」页，底栏不要白长条。
- 修改：`art:ui` 1K 出 `art/generated-art/me-creamflat-tab-ui/ui-1.png`～`ui-5.png`。未改小程序代码。
- 验证：未改页面，无需构建。请看这 5 张选图标和底栏方向。未做真机点验。

## 2026-09-09 13:17 (UTC+8)
- 原因：再出几张手绘风「我的」页参考，不要求极简。
- 修改：2K 整页接口 terminated，改 1K 逐张 `art:ui`。成稿 `art/generated-art/me-row-icons-handdrawn-rich-ui/ui-1.png`～`ui-5.png`。未改小程序代码。
- 验证：未改页面，无需构建。请看这 5 张选图标方向。未做真机点验。

## 2026-09-09 12:50 (UTC+8)
- 原因：「我的」页左侧图标要改手绘简洁风，先出整页参考。
- 修改：`art:ui` 出稿 `art/generated-art/me-row-icons-handdrawn-ui/ui-3.png`、`ui-5.png`。其余 8 张接口 terminated，未再盲重试。未改小程序代码。
- 验证：未改页面，无需构建。请看上述 2 张稿选方向。未做真机点验。

## 2026-09-09 12:20 (UTC+8)
- 原因：我的页图标偏小，原生开关偏胖短。
- 修改：图标 48rpx→72rpx；深色/震动改为自绘瘦长开关 100×52rpx。未改 banner。
- 验证：`shareWiring` + `motionPreference` 共 10 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 看「我的」页图标是否更大、开关是否更瘦长。未做真机点验。未改 banner。

## 2026-09-09 12:05 (UTC+8)
- 原因：按 ui-3 给「我的」页四行入口和深色/震动开关加统一陶土橘图标。
- 修改：kit 出 6 枚图标，抠图后落包；`pages/me` 列表与开关行左侧加 48rpx 图标。未改 banner。
- 验证：`shareWiring.test.ts` 6 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 看「我的」页：清理/隐私/分享/反馈四行，以及深色模式、震动反馈两行，左侧都应有统一陶土橘图标。未做真机点验。未改 banner。

## 2026-09-09 11:44 (UTC+8)
- 原因：用户对照现「我的」页，问图标颜色统一是否更好看，要再生图参考。
- 修改：`art:ui` 统一陶土橘图标稿，成 3 张：`art/generated-art/me-entry-icons-unified-ui/ui-1.png`、`ui-3.png`、`ui-4.png`。`ui-2`/`ui-5` 中途失败未重试。未改小程序代码。

## 2026-09-09 11:20 (UTC+8)
- 原因：答题停顿要还原；报告「更多可以试的事」从 2 起编；我的页 item 先出带图标设计稿。
- 修改：去掉答题 `PLAY_CONFIRM_MS`；报告编号改为 `index + 1`；`art:ui` 出「我的」页带行首图标的 5 张稿。
- 验证：聚焦 3 文件 18 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 看答题立即切题、报告行动项从 1 编号。「我的」页 5 张稿在 `art/generated-art/me-entry-icons-ui/`，未改该页代码。未做真机点验。

## 2026-09-09 11:20 (UTC+8)
- 原因：收口 8 处表现：今日入口直达、答题确认节奏、报告展开与底栏、按压态、暗色补丁、记录可扫、详情封面、分享卡分类标记。
- 修改：`miniapp/src` 下 experience/recordInsights/reportShareCard 与测试中心、答题、报告、记录、详情、底栏、app.scss。
- 验证：聚焦 6 文件 28 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。未做真机点验。未改塔罗流程。

## 2026-09-08 19:22 (UTC+8)
- 原因：测测子底图月亮和猫偏上。
- 修改：品牌卡底图裁切上移，主体在框里略靠下。未重出图。
- 验证：`shareWiring.test.ts` 6 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 看月亮和猫是否略靠下。未做真机点验。

## 2026-09-08 19:06 (UTC+8)
- 原因：我的页底部空白太大，测测子栏过高。
- 修改：去掉 tab 预留底边距；品牌卡 456rpx→300rpx。
- 验证：`shareWiring.test.ts` 6 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 看「我的」页卡高与底部空白。未做真机点验。

## 2026-09-08 19:00 (UTC+8)
- 原因：测测子栏底图不像参考；页脚被 tab 裁切；去掉本机说明；版本右对齐。
- 修改：按 ui-1 重生并落包 `me-banner-v3.jpg`；卡高 456rpx；底边距 280rpx；页脚只留右对齐版本号。
- 验证：`shareWiring.test.ts` 6 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`，看「我的」页底图、页脚版本是否完整露出。未做真机点验。

## 2026-09-08 18:50 (UTC+8)
- 原因：按选定稿把「我的」页测测子栏改成铺满插画，版本号收到页脚。
- 修改：品牌卡 360rpx 铺满 `me-banner-v2.jpg`，左侧叠店名和 slogan，不可跳转；版本移到页脚。
- 验证：`shareWiring.test.ts` 6 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`，看「我的」页品牌卡与页脚版本。未改设置列表，未做真机点验。

## 2026-09-08 18:40 (UTC+8)
- 原因：「我的」页测测子栏要插画铺满、不要测试入口；先出设计稿不改代码。
- 修改：`art:ui` 5 张整页稿在 `art/generated-art/me-banner-ui/`；铺满插画目前只有 `me-banner-horizon.png`。
- 验证：未改 `miniapp/` 代码，未构建。请直接看上述 PNG 选方向。

## 2026-09-08 18:11 (UTC+8)
- 原因：测试未选中要用 `review-test-idle-c.png`，上次误用了同名 jpg。
- 修改：抠图升名落包 `test-v6.png` 并改引用。
- 验证：`appConfig.test.ts` 9 项通过。清 `miniapp/dist` 后根目录 `npm run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`，看测试未选中。记录图标仍未换。

## 2026-09-08 18:10 (UTC+8)
- 原因：塔罗解读记录要点进详情；塔罗仪式补震动。
- 修改：历史面板点进复用解读正文；haptics 增加脉冲/强度/长震并接到洗牌、抽牌、切牌、翻牌与出解读。
- 验证：聚焦 5 文件 27 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`：点解读记录看详情；真机感受洗牌连续震与抽/翻牌触感。开发者工具震动可能不明显。未改「我的」页。

## 2026-09-08 17:56 (UTC+8)
- 原因：测试未选中用 review-test-idle-c；记录两态重出审核稿、不换线上图。
- 修改：落包 `test-v5.png`；记录新稿 `art/generated-art/review2-records-*.jpg`。
- 验证：`appConfig.test.ts` 9 项通过。清 `miniapp/dist` 后根目录 `npm run build:weapp` 成功。记录图标未换，请在开发者工具看测试未选中；记录新稿只在 `art/generated-art/review2-records-*.jpg`。未做真机点验。

## 2026-09-08 15:02 (UTC+8)
- 原因：白底再降一点（不透明、item 居中）；点 tab 整栏会藏一下再出现。
- 修改：栏高改为 `88rpx + 安全区`；点击只改选中态，不再按旧路由误藏。
- 验证：聚焦 4 文件 33 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。未做真机点验。

## 2026-09-08 14:42 (UTC+8)
- 原因：白条下面空出一块米色。
- 修改：去掉透明安全区垫层；白底按 `96rpx + 安全区` 铺到屏幕底，图标在整条白底里居中。
- 验证：聚焦 2 文件 13 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。未做真机点验。

## 2026-09-08 14:38 (UTC+8)
- 原因：白底再压低一点。
- 修改：白底 dock 收到 76rpx 并居中；安全区改透明垫层，不再把白底拉高。
- 验证：聚焦 2 文件 13 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。未做真机点验。

## 2026-09-08 14:35 (UTC+8)
- 原因：降高后 tab 又没居中——官方槽比内容区高，图标沉底。
- 修改：铺满官方槽；白底只画在底部 dock 并在其中居中；`tabBgColor` 改成页面底色，避免官方槽再铺一层白。
- 验证：聚焦 3 文件 27 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。未做真机点验。

## 2026-09-08 14:30 (UTC+8)
- 原因：tab 已居中但白底偏高。
- 修改：内容区降到 88rpx 并在其中居中；安全区只垫底；页面底边距 148→132rpx。
- 验证：聚焦 2 文件 13 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。未做真机点验。

## 2026-09-08 14:24 (UTC+8)
- 原因：tab item 仍未上下居中——安全区被垫在内容下方。
- 修改：去掉容器底 padding；item 在 `102rpx + 安全区` 的整条白底里垂直居中，总高度不变。
- 验证：聚焦 3 文件 27 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。未做真机点验。

## 2026-09-08 14:16 (UTC+8)
- 原因：测试卡拥挤来自介绍行；tab item 要居中但不能抬高白底。
- 修改：去掉卡片 benefit；spot 还原 `right: 10rpx`；tab item 在 102rpx 内容区垂直居中，安全区改到容器底 padding。
- 验证：聚焦 3 文件 27 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。未做真机点验。

## 2026-09-08 12:45 (UTC+8)
- 原因：按截图收口隐私页拥挤、雷达无维度、测试卡图标贴字、tab 白底过高且点「我的」闪一下、选中态只换色/旋转、报告底空白过大。
- 修改：隐私页标题与日期拆开并左对齐加疏朗间距；雷达顶点画轴标签；测试卡 spot 右移 6rpx；tab 栏内容区 102rpx 且图标靠上；按路由初始化选中态并缓存主题 chrome；kit 重生 8 枚 v4 图标（合上/摊开、牌背/牌面、坐姿/招手）；报告页 border-box 并收紧底边距。
- 验证：聚焦 6 文件 55 项通过。清 `miniapp/dist` 后 `npm --prefix miniapp run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。未做真机点验。

## 2026-09-08 11:40 (UTC+8)
- 原因：底部 tab 图标和文字再大一点。
- 修改：图标 68rpx、文字 24rpx、栏高 120rpx；测试/记录/我的底边距 168rpx。
- 验证：聚焦 2 文件 22 项通过。清 `miniapp/dist` 后 `npm run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。

## 2026-09-08 11:35 (UTC+8)
- 原因：详情去掉「你会看到」并把注意改成答题指引；「像你吗」只存本机无产品价值故下线；卡片右侧比左侧更贴边。
- 修改：注意文案改为「没有标准答案…」；报告去掉符合度栏；`tab-page__scroll` 改回 `width: 100%`。
- 验证：聚焦 4 文件 18 项通过。清 `miniapp/dist` 后 `npm run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。未做真机点验。

## 2026-09-08 11:25 (UTC+8)
- 原因：今日入口再高一点、右侧图标缩小；底部 tab 图标太简陋，走 kit 重生。
- 修改：hero 280rpx 插画、栏高约 216rpx；8 枚 tab 图标 kit 生图 + 泛洪抠图后落包 `*-v3.png`（162px，约 18–26KB），展示 56rpx。
- 验证：聚焦 2 文件 22 项通过。清 `miniapp/dist` 后 `npm run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。未做真机点验。

## 2026-09-08 10:48 (UTC+8)
- 原因：今日入口要更矮、右侧图标更大；我的页测测子图标放大；去掉动效栏；震动/主题改开关且主题不跟随系统；评估隐私政策。
- 修改：今日入口插画 360rpx 溢出裁切；我的 banner 380×252rpx；设置改为深色模式/震动两个 Switch；主题默认浅色，旧 auto 当浅色；隐私页补 COS 与日志口径并更新日期。
- 验证：聚焦 6 文件 33 项通过。清 `miniapp/dist` 后 `npm run build:weapp` 成功。请用微信开发者工具导入 `miniapp/` 预览最新 `dist`。未做真机点验。

## 2026-09-08 10:30 (UTC+8)
- 原因：`feat/experience-completion` 已快进合并到 `main`（`e84bd45`）。
- 验证：在 `D:/Mine/PtKing-miniapp/miniapp` 清缓存后 `npm run build:weapp` 成功。请用该目录最新 `dist` 预览。未推远程。

## 2026-09-08 10:26 (UTC+8)
- 原因：按真机截图收口今日入口体量、报告底栏按钮过多、我的页冗余入口，并修复隐私页 View 未导入。
- 修改：今日入口缩小标题/内边距、插画 240rpx；报告底栏改为主按钮 + 文字相关测试 + 分享/回中心并排，去掉定型收尾句；我的页去掉未完成/已做/塔罗历史。
- 验证：聚焦 3 文件 16 项通过。随后合入 main。

## 2026-09-08 10:01 (UTC+8)
- 原因：收口类型检查与报告衔接子任务留下的 7 个 tsc 错误。
- 修改：`SaveRecordMeta` 补回 `resultTitle`；记录 fixture 补 `factorScores`；塔罗 `eventCenter` 清理改为语句块；解读阶段先收窄再读 `reading`；飞牌 CSS 变量断言；塔罗资源测试的 `wx.downloadFile` 不再绑 Mock 类型。
- 验证：`tsc --noEmit` 通过；聚焦测试 4 文件 43 项通过。未改底栏 3 个文件，未做微信预览。

## 2026-09-08 09:50 (UTC+8)
- 原因：完成全库题目/文案精修、分享卡片分类语气、漏斗补全；塔罗资源未就绪不准进，不要纯文字模式。
- 修改：
  - 新增 `miniapp/src/domain/contentQuality.ts` 与测试：扫描定论句、重复题、双问号、临床/占卜词、声明口径。
  - 软化 `unhinged`/`workRole`/`sarcastic`/`petPersona`/`goofy`/`loveTalk`/`sleep` 的定论句、双问号、治疗/处方与声明。
  - 新增 `shareCopy.ts`：按人格/情感/职场/趣味写分享标题与卡片 hook；分享卡底部加「娱乐向自我观察，不是诊断」，不画分数。
  - 详情 `test_start_click`、答题 `test_leave`（完测不记离开）、报告 `report_fold`/`report_retest`/`report_related`。
  - 塔罗去掉「占卜」措辞；重试先 `setResourcesLoaded(false)`；失败只给重试/退出，不进七幕。
- 验证：聚焦测试 14 文件 162 项通过（含体验契约 3 项）；`npm run build:weapp` 成功，产物 `D:/Mine/PtKing-polish/miniapp/dist`。未做微信开发者工具/真机验收；分享出图、塔罗下载、漏斗日志未点验。未发布 COS。
- 未收编：`app.config.ts`、`custom-tab-bar/index.tsx`、`useTabBarSelected.ts`。

## 2026-09-08 09:35 (UTC+8)
- 原因：补记验证。
- 验证：聚焦测试 12 文件 146 项通过；`npm run build:weapp` 成功，产物 `D:/Mine/PtKing-polish/miniapp/dist`。未做微信开发者工具/真机验收，未发布 COS。

## 2026-09-08 09:32 (UTC+8)
- 原因：并行接入导致报告页重复声明 presentation/submitFeedback，构建失败。
- 修改：miniapp/src/pages/test-report/index.tsx 删除重复声明，保留带原因字段的本地反馈保存。

## 2026-09-08 09:28 (UTC+8)
- 原因：SN 维度出现重复含义题，雷达契约未认 Taro Canvas，空态跳转改用 Taro API。
- 修改：去掉重复 SN 题；testFlow 契约同时匹配 canvas/Canvas 与 Taro.switchTab。

## 2026-09-08 09:25 (UTC+8)
- 原因：收口剩余体验优化：答题简洁动效、MBTI 44题、报告反馈、记录管理、内容导出。
- 修改：答题页挂 motion 类并区分系统/标准/简洁；MBTI 补 2 题并同步 7 分钟文案；报告页展示解释与三档反馈；记录页增加筛选、中性趋势、单条删除与空态承接；新增单条删除与签名版本比较；新增 content/export-registry.mjs。
- 未改：广告解锁、COS 发布、kit 出图、根微信工程配置。

## 2026-09-07 20:41 (UTC+8)
- 原因：跳转增加失败回调与参数编码后，不应被旧的单行源码断言误判。
- 修改：miniapp/src/config/testFlow.test.ts 更新redirectTo接线断言，保留完整链路保障。

## 2026-09-07 20:21 (UTC+8)
- 原因：详情页需要在开始前说明报告收益与答题方式，减少用户盲点。
- 修改：miniapp/src/pages/test-detail/index.tsx 增加按计分模式说明图表/结果展示与第一反应提示；index.scss 增加说明卡样式。

## 2026-09-07 20:19 (UTC+8)
- 原因：类型检查要求afterEach返回void。
- 修改：miniapp/src/services/haptics.test.ts 清理回调改语句块。

## 2026-09-07 19:57 (UTC+8)
- 原因：清空测试报告不等于所有本地数据，补反馈与微信实时日志处理说明。
- 修改：miniapp/src/pages/privacy/index.tsx 更正删除范围，说明本地反馈及客服/运行日志边界。

## 2026-09-07 19:56 (UTC+8)
- 原因：隐私页使用View/Text但缺少组件import，构建转译并不能捕获该运行时错误。
- 修改：miniapp/src/pages/privacy/index.tsx 补Taro组件导入。

## 2026-09-07 19:55 (UTC+8)
- 原因：系统弹窗失败不等于用户要求重来。
- 修改：miniapp/src/services/testDrafts.ts 弹窗fail或throw按继续处理，保留草稿。

## 2026-09-07 19:54 (UTC+8)
- 原因：防记录因全文题库签名膨胀，同时计分版本变化需可识别。
- 修改：miniapp/src/services/testDrafts.ts 使用带长度的双非密码学hash v2签名，包含题目与scoring；旧草稿签名不兼容会失效，不影响已保存报告。

## 2026-09-07 19:53 (UTC+8)
- 原因：原草稿签名将完整题库字符串复制入每条记录，且计分变化不失效；弹窗异常会清空草稿。
- 修改：miniapp/src/services/testDrafts.test.ts 增加紧凑签名、计分变化和弹窗失败保护测试。

## 2026-09-07 19:51 (UTC+8)
- 原因：防保存失败却删除草稿/进入空报告，绑定结果内容版本并避免热更改变旧报告。
- 修改：miniapp/src/pages/test-play/index.tsx 保存成功才清草稿，失败保留重试；写入contentSignature/reportSnapshot，跳转失败说明已保存，完成日志不含类型结果。

## 2026-09-07 19:50 (UTC+8)
- 原因：漏斗不需要上传具体选项，避免推导个人答案。
- 修改：miniapp/src/pages/test-play/index.tsx test_answer只保留testId与题序。

## 2026-09-07 19:49 (UTC+8)
- 原因：阻止250ms内双击连续答两题。
- 修改：miniapp/src/pages/test-play/index.tsx 在choose入口执行输入锁，保持正常自动切题。

## 2026-09-07 19:48 (UTC+8)
- 原因：续答弹窗结束前不接受输入，离开页面不再异步恢复旧状态。
- 修改：miniapp/src/pages/test-play/index.tsx 恢复过程加active保护、显式结束restoring并记录续答数量。

## 2026-09-07 19:47 (UTC+8)
- 原因：防快速连点跨题误选与续答对话尚未完成时答题。
- 修改：miniapp/src/pages/test-play/index.tsx 增加输入锁、计时器清理与草稿恢复状态。

## 2026-09-07 19:45 (UTC+8)
- 原因：剩余与阶段提示统一使用真实未答数量。
- 修改：miniapp/src/pages/test-play/index.tsx 改正最后题还剩0和已过半却说快过半的问题。

## 2026-09-07 19:44 (UTC+8)
- 原因：最后题未答不能显示100%。
- 修改：miniapp/src/pages/test-play/index.tsx 以answers.length计算进度和剩余题。

## 2026-09-07 19:43 (UTC+8)
- 原因：移除上一轮服务层纯算法放置。
- 修改：miniapp/src/pages/test-play/index.tsx 改用domain/experience的进度与阶段函数；原工作区未跟踪testPlayStage文件不收编。

## 2026-09-07 19:42 (UTC+8)
- 原因：进度语义改为真实完成数量，不再以当前题页充作已完成。
- 修改：miniapp/src/services/testDrafts.test.ts 更新对应契约。

## 2026-09-07 19:40 (UTC+8)
- 原因：为今日入口增加可点击暗示，卡片收益不压插图。
- 修改：miniapp/src/pages/test/index.scss 增加hero-link、card-benefit与按压态样式。

## 2026-09-07 19:39 (UTC+8)
- 原因：保留原美术而给今日说明留足横向空间。
- 修改：miniapp/src/pages/test/index.scss 将顶部插画缩到180rpx，未生成或改动图片。

## 2026-09-07 19:38 (UTC+8)
- 原因：首页今日入口未覆盖职场、跨日不更新、筛选后结果在屏外，滚动视口padding可能形成底部空白裁切。
- 修改：miniapp/src/pages/test/index.tsx 将间距放内部View，今日入口四类自然日轮换并在show时刷新、点击清空搜索且定位结果；增加卡片收益说明，续答显示已完成题数，补入口点击枚举埋点。

## 2026-09-07 19:35 (UTC+8)
- 原因：锁定滚动视口与内容分离、完成保存次序与埋点隐私。
- 修改：新增 miniapp/src/config/experienceFlow.test.ts 页面契约测试。

## 2026-09-07 19:34 (UTC+8)
- 原因：展示真实震动偏好保存状态。
- 修改：miniapp/src/pages/me/index.tsx 仅保存成功更新选中态，失败提示重试。

## 2026-09-07 19:33 (UTC+8)
- 原因：设置不能在持久化失败时假报成功。
- 修改：miniapp/src/services/haptics.ts 的 setHapticsEnabled 返回明确boolean，无API或异常为false。

## 2026-09-07 19:32 (UTC+8)
- 原因：新增回归测试先失败，落实确定性的进度与日期规则。
- 修改：新增 miniapp/src/domain/experience.ts，已答数量计算剩余与百分比、修正过半提示、按连续自然日轮换四个主题。

## 2026-09-07 19:31 (UTC+8)
- 原因：补齐震动存储异常与无平台API的缺口。
- 修改：新增 miniapp/src/services/haptics.test.ts，验证开关持久化、关闭后不震动以及存储失败返回false。

## 2026-09-07 19:30 (UTC+8)

- 原因：接续体验优化，原工作区保留配置与图标工具的无关改动；远端fetch因127.0.0.1:7897代理不可用失败，以本地main 3229b3d创建独立feat/experience-completion工作区。
- 修改：接续上一轮首页、答题页、报告页、我的页与haptics未提交改动。新增miniapp/src/domain/experience.test.ts，先锁定未答题数量、过半语义、每日四分类轮换边界。
- 非目标：不改广告，不改kit，不发布COS，不合main，不收编微信项目配置或make-tabbar-icons.cjs。
- 说明：本文件记录当前独立工作区变更；原工作区context.md完整历史保留未动，提交前将恢复基线历史并追加本轮日志。
