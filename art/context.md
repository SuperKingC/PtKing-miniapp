# 工作记录

- 时间：2026-09-12 18:10
- 原因：用户反馈今日推荐栏有锯齿，要求「根据参考图重新切」。
- 修改：三页参考稿 `reference-ui.png` 已不在盘上（gitignore 未入库），改从它在 git 里的直裁产物 `hero-card-v3.png`（e5df4de）重做。病根：v7 按 alpha>=200 二值化把真彩边压成 1px 台阶（alpha 级数 64→16），v8 又对每列底缘盖固定斜坡 `[235,120,36,0]`，两者都不跟真实轮廓。新脚本 `miniapp/art/ref-pages-v3/rebuild-hero-card-v9.py`：清残框（右缘 x>=670 暖灰条 / 左缘 x=0 暖灰线 / 底缘 y>=307 半透明灰带）→ 4x 超采样重建轮廓过渡 → 核心内 alpha 原样保留（烘焙软影不动）→ 核心外取 AA 并给 RGB(0,0,0) 像素补本体色（免黑晕）。落包 `hero-card-v9.png` 76KB（TinyPNG），alpha 级数 47、硬跳变列 0、AA 环最暗合成亮度 202（v8 为 132）。`compress-hero-v9.mjs` 走压缩；`miniapp/src/config/heroCardEdges.test.ts` 锁剖面契约；test 页与两处契约断言 v8→v9。

- 时间：2026-09-09 17:20
- 原因：从 ui-4 整页裁图标会带卡底，不能当抠图用。
- 修改：记录改回使用已泛洪的 v4 列表图标与 v7 底栏，卡片阴影改 CSS。

- 时间：2026-09-09 17:05
- 原因：重生图标缺 ui-4 软阴影。
- 修改：从 `me-heal-preview-ui/ui-4.png` 裁列表 6 枚与底栏 4 枚，保留投影不泛洪；升名为 `icon-me-*-v5.png`、`*-v8.png`。

- 时间：2026-09-09 17:00
- 原因：用户选定 ui-4，全包插画改软陶毡面；品牌栏字画进图；底栏也换。
- 修改：kit 1K 生 tab v7 八枚约 $1.93、插画六张约 $1.45、banner 一张约 $0.18；泛洪抠图后 162/360px 落包；banner 750×500 JPEG 约 44KB。`prompts.txt` 头注释与 v7/v2/v4 条目同步。

- 时间：2026-09-09 16:30
- 原因：用户选定 heal-preview ui-4，列表图标接软陶毡面。
- 修改：`prompts-me-row-icons-v4.txt` / `prompts.txt`；参考 ui-4；kit 1K 约 $1.44；泛洪抠图后 162px 落包 `icon-me-*-v4.png`（约 11–18KB）。

- 时间：2026-09-09 16:14
- 原因：用户说 v3 不好看，要先预览再接线；底栏背景也要几版。
- 修改：`prompts-me-heal-preview-ui.txt`；`art:ui` 1K 5 张：`art/generated-art/me-heal-preview-ui/ui-1.png`～`ui-5.png`（约 $0.88）。未改小程序代码。

- 时间：2026-09-09 15:55
- 原因：列表图标要和底栏治愈奶油扁平一致，不再用手绘水彩。
- 修改：`prompts-me-row-icons-v3.txt` / `prompts.txt`；参考 records-v5、me-v4；kit 1K 约 $1.38；泛洪抠图后 162px 落包 `icon-me-*-v3.png`（约 11–19KB）。

- 时间：2026-09-09 15:15
- 原因：按 ui-1 手绘淡彩换列表图标；底栏去掉白条改燕麦浮岛。
- 修改：`prompts-me-row-icons-v2.txt` / `prompts.txt` 补 6 条；kit 1K 生图约 $1.38；泛洪抠图后 162px 落包 `miniapp/src/assets/illus/icon-me-*-v2.png`（约 14–21KB）。

- 时间：2026-09-09 14:53
- 原因：上一轮提示词锁死奶油扁平，且没禁重画 tab 图标。按用户两点改正后再出稿。
- 修改：`prompts-me-newstyle-keep-tabicons-ui.txt`；参考 `test-v6`/`me-v4`；`art:ui` 1K 5 张全成：`art/generated-art/me-newstyle-keep-tabicons-ui/ui-1.png`～`ui-5.png`（约 $0.89）。未改小程序代码。

- 时间：2026-09-09 14:36
- 原因：按原本奶油扁平风重设计「我的」页，并换掉底部白 tab 条。
- 修改：`prompts-me-creamflat-tab-ui.txt`；`art:ui --size 1K` 5 张全成：`art/generated-art/me-creamflat-tab-ui/ui-1.png`～`ui-5.png`（约 $0.85）。未改小程序代码。

- 时间：2026-09-09 13:17
- 原因：用户要再出几张手绘风参考，不要求极简。2K 整页连续 terminated，改 1K 逐张出。
- 修改：`prompts-me-row-icons-handdrawn-rich-ui.txt`；`art:ui --size 1K` 5 张全成：`art/generated-art/me-row-icons-handdrawn-rich-ui/ui-1.png`～`ui-5.png`（约 $0.85）。彩铅/水彩填色，不是细线简笔画。未改小程序代码。

- 时间：2026-09-09 12:50
- 原因：「我的」页左侧图标要改手绘简洁风，先出整页参考不改代码。
- 修改：`prompts-me-row-icons-handdrawn-ui.txt`；`art:ui` 两轮共 10 次请求，接口大量 terminated。成稿 2 张：`art/generated-art/me-row-icons-handdrawn-ui/ui-3.png`（沉浸式）、`ui-5.png`（混合布局），约 $0.69。未改小程序代码，未换现有 `icon-me-*-v1.png`。

- 时间：2026-09-09 12:05
- 原因：落地「我的」页 ui-3 风格列表/开关图标。
- 修改：kit 出 6 枚 `art/generated-art/me-row-icons/`（约 $1.38）；泛洪抠图后 162px 落包 `miniapp/src/assets/illus/icon-me-*-v1.png`（约 10–21KB）。`prompts.txt` 补 6 条。

- 时间：2026-09-09 11:52
- 原因：对照现界面，看列表图标统一陶土橘是否更好看；先出稿不改代码。
- 修改：`prompts-me-entry-icons-unified-ui.txt`；成稿 `ui-1`/`ui-3`/`ui-4`（约 $1.03）。`ui-2`/`ui-5` 接口 terminated，未盲重试。未改小程序代码。

- 时间：2026-09-09 11:25
- 原因：「我的」页列表项要加图标，先出设计稿不改代码。
- 修改：`prompts-me-entry-icons-ui.txt`；`art:ui` 5 张整页稿在 `art/generated-art/me-entry-icons-ui/ui-1.png`～`ui-5.png`（约 $1.70）。设计稿超 180KB/包体红线，只作挑选，不进主包。

- 时间：2026-09-08 19:00
- 原因：按 ui-1 参考重生测测子栏底图。
- 修改：kit 出 `me-banner-v3.png`（参考 ui-1 + 原猫图）；降到 900×600 JPEG 并 TinyPNG，落包 `me-banner-v3.jpg`（约 53KB）。

- 时间：2026-09-08 18:50
- 原因：测测子栏落地铺满底图。
- 修改：用已出 `me-banner-horizon.png` 降到 900×600 JPEG 并 TinyPNG 一次，落包 `miniapp/src/assets/illus/me-banner-v2.jpg`（约 30KB）。`prompts.txt` 补 `me-banner-v2`。

- 时间：2026-09-08 18:40
- 原因：「我的」页测测子栏尝试插画铺满整卡，不要测试入口；先设计生图不改代码。
- 修改：`prompts-me-banner-ui.txt` 出 5 张整页稿到 `art/generated-art/me-banner-ui/ui-1.png`～`ui-5.png`（约 $1.63）。铺满插画只成 1 张 `me-banner-fullbleed/me-banner-horizon.png`；其余 4 张接口中途 terminated，未再盲重试。未改小程序代码。


- 时间：2026-09-08 18:08
- 原因：用户指定的是 `review-test-idle-c.png`（水彩探头猫），不是同名 jpg。
- 修改：对该 PNG 泛洪抠图后 162px 升名落包 `test-v6.png`；`prompts.txt` / `prompts-tabbar.txt` 补 `icon-tab-test-v6`。

- 时间：2026-09-08 17:56
- 原因：用户选定测试未选中用 review-test-idle-c；记录两态上一轮不满意，再出一版审核、不落包。
- 修改：`review-test-idle-c.jpg` 泛洪抠图后 162px 落包 `miniapp/src/assets/tabbar/test-v5.png`；`prompts.txt` / `prompts-tabbar.txt` 补 `icon-tab-test-v5`。记录两态新提示词 `prompts-tabbar-review-records-v2.txt`，产物 `art/generated-art/review2-records-*.jpg`，未改记录线上图标。

- 时间：2026-09-08 17:31
- 原因：用户要求测试未选中、记录选中/未选中再出几版审核，不要直接换线上图标。
- 修改：提示词写入 `prompts-tabbar-review.txt` 及分批文件；kit 生图落到 `art/generated-art/review-test-idle-*`、`review-records-idle-*`、`review-records-active-*`。未改 `miniapp/src/assets/tabbar`、未改 `app.config.ts` / custom-tab-bar 引用。

- 时间：2026-09-08 17:00
- 原因：塔罗单牌太瘦，记录摊开太扁，占比不匀。
- 修改：`prompts.txt` / `prompts-tabbar.txt` 增加 v5（扇形三张牌、立着打开的本子）；kit 生图后泛洪抠图，162px 落包 `tarot-v5` / `records-v5`。

- 时间：2026-09-08 12:45
- 原因：选中/未选中要同一物件不同状态，不是换色或旋转。
- 修改：`prompts.txt` 与 `prompts-tabbar.txt` 写成合上/摊开测验纸、牌背/牌面、合上/打开笔记本、坐姿/招手猫；kit 生图 8 张后泛洪抠图，降到 162px 打进 `miniapp/src/assets/tabbar/*-v4.png`。

- 时间：2026-09-08 11:25
- 原因：tab 图标从剪影升级为插画。
- 修改：`prompts.txt` 与 `prompts-tabbar.txt` 写成猫/测验纸、塔罗牌、爪印笔记本、正面猫吉祥物；kit 生图 8 张后泛洪抠图，降到 162px 打进 `miniapp/src/assets/tabbar/*-v3.png`。
