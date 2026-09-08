# 工作记录

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
