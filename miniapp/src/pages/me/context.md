# 工作记录

- 时间：2026-09-10 18:42
- 原因：横幅比 ui-4 参考稿暗（采样：素材蓝 136/153/161 vs 参考 155/166/168）；问题反馈与深色模式两卡间距偏近。
- 修改：浅色横幅滤镜改 `brightness(1.09) saturate(0.55)`（Python 采样模拟滤镜组合校准，误差 <1）；prefs 上距 24→40rpx；shareWiring banner-img filter 断言放宽为 `filter: [^}]*var(--shadow-image)`。开发者工具 18:40 fresh dist 预览：横幅亮度与参考稿一致，卡间距舒适。

- 时间：2026-09-10 18:32
- 原因：用户要求全部界面去掉屏幕最上面的「测测子」系统标题栏，内容整体上移。
- 修改：app.config 全局 `navigationStyle: 'custom'`；新增 `services/navMetrics.ts`（胶囊底边+8px → CSS 变量 `--page-top-inset`，兜底 88px，单测 4 例）接线四 tab 页根节点 style；八个页面 padding-top 改 `calc(var(--page-top-inset) + 8rpx)`（test/records/tarot/me/test-detail/test-play/test-report/privacy）；shareWiring 契约同步（inset 断言收窄到 box-shadow、me padding 更新）。automator 验证：胶囊底边 83px→根节点注入 91px，四 tab+详情页 fresh dist 布局正确。

- 时间：2026-09-10 18:12
- 原因：对照参考稿卡面还是「薄片」：阴影只朝外垫，没有包进卡面，缺枕头感。
- 修改：`--shadow-slab` 再加两层内阴影（顶部内高光提纯 + `inset 0 -12rpx 20rpx` 底部内软影，浅/深四处）；entries/prefs 卡与底栏 dock 加 `linear-gradient(180deg)` 上亮下沉微渐变；暗色 dock 硬编码投影同步。shareWiring 契约同步内阴影断言。开发者工具 18:10 fresh dist 预览：卡面底部有向内包的软影，鼓起感接近参考稿。

- 时间：2026-09-10 17:58
- 原因：对照 ui-4 参考稿，区块间距偏开、卡片看不出厚度、底栏立体感不足。
- 修改：`--shadow-slab` 改厚毡五层（顶部内高光 + 实色米棕侧壁 `0 6rpx 0 #e3d3b6` + 接触影 + 偏左下宽软影，浅/深四处同步）；间距收紧（横幅下 24rpx、区块间 24rpx、列表行 padding 8rpx、开关行 96rpx、页底 40rpx）。shareWiring 契约同步（inset 限制改为厚毡同构断言）。开发者工具 17:57 fresh dist 预览：厚度墙与宽软影接近参考稿。

- 时间：2026-09-09 18:23
- 原因：`--shadow-card` 上身偏薄，没有参考稿厚毡浮起的立体感。
- 修改：app.scss 新增 `--shadow-slab`（浅/深两套三层暖棕投影），banner/entries/prefs 切换过去；图标改双层 `drop-shadow`（贴地接触影+远环境影）。开发者工具 18:24 fresh dist 预览：三块投影厚度接近参考稿。

- 时间：2026-09-09 18:09
- 原因：`shadow-slab-v1.png` 是不透明棕色色块，卡片米色底打在父层、绘制顺序在阴影图之下，列表卡中下部整片被糊成黑雾；640×400 经 scaleToFill 拉到三张不同高度卡片，边缘模糊宽度各不相同。
- 修改：删三处 slab-shadow Image 与该 PNG；三块厚毡回归 CSS box-shadow（令牌见 app.scss）；列表/开关图标由 CSS 统一给影（资产本身无烘焙阴影）；版本号居中对齐参考稿。

- 时间：2026-09-09 17:40
- 原因：参考图厚毡块是画进去的柔光，CSS 投影不够；月亮要更靠下被裁切。
- 修改：垫 `shadow-slab-v1.png`；卡面改毡色 `#faf3ea` 加内凹光；banner 图 480rpx 顶对齐，底部裁掉月亮。

- 时间：2026-09-09 17:30
- 原因：对照 ui-4，品牌栏过高、卡片四周没有厚毡块投影。
- 修改：banner 高 456rpx→320rpx、圆角 48rpx；投影改 `.me-page__slab` 三层扩散；padding 挪进内部 View，去掉 enhanced，避免 ScrollView 裁阴影。

- 时间：2026-09-09 17:20
- 原因：图一米色方底来自 ui-4 整页裁切；阴影是卡片周围 CSS 投影，不是图标脚下。
- 修改：列表改回抠干净的 `icon-me-*-v4.png`；品牌栏/列表/开关卡外层投影、内层裁圆角；行间虚线分隔。

- 时间：2026-09-09 17:05
- 原因：列表图标改从 ui-4 原图裁切，保留软投影。
- 修改：`index.tsx` 引用 `icon-me-*-v5.png`。

- 时间：2026-09-09 17:00
- 原因：品牌栏改用 ui-4，文字画进图。
- 修改：引用 `me-banner-v4.jpg`；去掉 veil 与 CSS 叠字；卡高改回 456rpx（3:2 铺满）。列表图标仍 `icon-me-*-v4.png`。

- 时间：2026-09-09 16:30
- 原因：顶部标题统一为测测子。
- 修改：`index.config.ts` 导航标题改为「测测子」。

- 时间：2026-09-09 16:30
- 原因：按 ui-4 接入列表图标。
- 修改：`index.tsx` 引用 `icon-me-*-v4.png`。banner 未改。

- 时间：2026-09-09 15:55
- 原因：左侧图标改成和底栏一样的治愈奶油扁平。
- 修改：`index.tsx` 引用 `icon-me-*-v3.png`。banner 与底栏结构未改。

- 时间：2026-09-09 15:15
- 原因：按 ui-1 换手绘淡彩列表图标。
- 修改：`index.tsx` 引用 `icon-me-*-v2.png`。底栏改动在 custom-tab-bar。banner 未改。

- 时间：2026-09-09 12:20
- 原因：列表图标偏小，原生开关偏胖短。
- 修改：`index.scss` 图标 48rpx→72rpx；深色/震动改为自绘瘦长开关 100×52rpx。banner 未改。

- 时间：2026-09-09 12:05
- 原因：按 ui-3 给四行入口和深色/震动开关加统一陶土橘图标。
- 修改：`index.tsx` 接入 6 枚 `icon-me-*-v1.png`；`index.scss` 图标 48rpx。banner 未改。
- 验证：`shareWiring.test.ts` 6 项通过。清 `miniapp/dist` 后 `build:weapp` 成功。

- 时间：2026-09-09 11:20
- 原因：列表项按压反馈全关。
- 修改：入口 button 的 hoverClass 改为 `pressable--pressed`。未改 banner 结构。

- 时间：2026-09-08 19:22
- 原因：测测子底图月亮和猫偏上。
- 修改：`index.scss` 底图改为 456rpx 高、`top: -40rpx`，裁切窗口上移，主体在卡里略靠下。

- 时间：2026-09-08 19:06
- 原因：底部空白太大；测测子栏太高。
- 修改：`index.scss` 去掉为 tab 预留的底边距，改为 `32rpx`；品牌卡高度 456rpx→300rpx。

- 时间：2026-09-08 19:00
- 原因：底图不像参考；页脚被裁；去掉本机说明；版本右对齐。
- 修改：换 `me-banner-v3.jpg`；卡高 456rpx 少裁云；底边距 280rpx；页脚只留右对齐版本号。

- 时间：2026-09-08 18:50
- 原因：测测子栏改为插画铺满，版本号收到页脚。
- 修改：`index.tsx` 底图 `me-banner-v2.jpg` + `aspectFill`，去掉卡上版本与点击；页脚增加版本。`index.scss` 卡高 360rpx，底图绝对铺满，左侧白字。

- 时间：2026-09-08 15:55
- 原因：tab 白栏再加高。
- 修改：`index.scss` 底边距 180rpx→220rpx。

- 时间：2026-09-08 15:52
- 原因：tab 白栏加高。
- 修改：`index.scss` 底边距 148rpx→180rpx。

- 时间：2026-09-08 15:30
- 原因：tab 改回铺满官方槽。
- 修改：`index.scss` 底边距改为 148rpx。

- 时间：2026-09-08 15:20
- 原因：tab 栏再降 10rpx。
- 修改：`index.scss` 底边距 136rpx→126rpx。

- 时间：2026-09-08 15:02
- 原因：tab 栏略降。
- 修改：`index.scss` 底边距 144rpx→136rpx。

- 时间：2026-09-08 14:42
- 原因：tab 白底铺回安全区。
- 修改：`index.scss` 底边距改为 144rpx。

- 时间：2026-09-08 14:38
- 原因：tab 白底再降。
- 修改：`index.scss` 底边距 132rpx→116rpx。

- 时间：2026-09-08 14:30
- 原因：tab 栏再降。
- 修改：`index.scss` 底边距 148rpx→132rpx。

- 时间：2026-09-08 12:45
- 原因：tab 栏变矮，避免列表被挡的同时少留空。
- 修改：`index.scss` 底边距 168rpx→148rpx。

- 时间：2026-09-08 11:40
- 原因：tab 栏加高后避免列表被挡住。
- 修改：`index.scss` 底边距改为 168rpx。

- 时间：2026-09-08 10:48
- 原因：我的页去掉动效栏；主题不再跟随系统，仅浅/深；震动与主题改为开关。
- 修改：`index.tsx` 去掉动效选择，主题/震动改 `Switch`；`index.scss` 测测子栏图标改为 380×252rpx，设置区改为开关行。
