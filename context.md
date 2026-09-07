# 工作记录

## 2026-09-07 11:53 (UTC+8)

- 原因：塔罗页面作为 tab 页进入时仍显示底部自定义 tab 栏，影响沉浸式全屏体验。
- 修改：`miniapp/src/pages/tarot/index.tsx` 在显示时隐藏 tabBar、离开时恢复 tabBar；`miniapp/src/features/tarot/MiniappTarotFlow.styles.test.ts` 增加对应生命周期调用的契约测试。
- 未修改：塔罗资源仍使用 COS 远程地址，本次未将资源迁入本地包。
- 验证：`npm test -- src/features/tarot/MiniappTarotFlow.styles.test.ts` 通过（13 项）；清理并执行 `npm run build:weapp` 成功，`miniapp/dist` 总计 1.69 MiB。

## 2026-09-07 11:58 (UTC+8)

- 原因：完成小程序界面、问卷、文案、动效与体验韧性的静态评审，汇总可实施的优先级建议。
- 新增：`C:\Users\admin\.cursor\projects\d-Mine-PtKing-miniapp\canvases\ptking-experience-review.canvas.tsx`，包含 P0/P1/P2 优化事项、相对投入与用户价值排序、问卷/文案/界面/动效建议及三阶段迭代路线。
- 未修改：未修改 `miniapp/` 业务代码、题库定义或项目配置。

## 2026-09-07 12:09 (UTC+8)

- 原因：补充体验结构梳理中可从源码直接证实的验收风险。
- 修改：更新 `C:\Users\admin\.cursor\projects\d-Mine-PtKing-miniapp\canvases\ptking-experience-review.canvas.tsx`，增加答题进度语义、报告 Canvas ID、塔罗资源失败恢复、记录页过期路径、测试数量口径和真机验收检查项。
- 未修改：未修改 `miniapp/` 业务代码、题库定义或项目配置。

## 2026-09-07 12:15 (UTC+8)

- 原因：COS 未配置时塔罗页仍可进入，且下载失败被当作成功，导致手机端资源空白。
- 修改：`miniapp/src/features/tarot/tarotAssets.ts` 严格校验下载 HTTP 状态并返回失败资源；`miniapp/src/features/tarot/MiniappTarotFlow.tsx` 增加失败闸门、重试和异步请求失效保护；`miniapp/src/features/tarot/MiniappTarotFlow.scss` 增加失败提示与重试按钮样式；`miniapp/src/features/tarot/MiniappTarotFlow.styles.test.ts` 增加资源失败不放行契约断言；`miniapp/src/features/tarot/tarotAssets.test.ts` 覆盖非 200 响应必须被视为资源失败。
- 未修改：塔罗资源仍放在 COS，未迁入本地包；COS 地址和资源路径未改变。
- 验证：`npm test -- src/features/tarot/tarotAssets.test.ts src/features/tarot/MiniappTarotFlow.styles.test.ts` 通过（18 项）；`npm run build:weapp` 成功，`miniapp/dist` 为 1.69 MiB，未包含塔罗资源。

## 2026-09-07 15:00 (UTC+8)

- 原因：塔罗资源失败后切到其他 tab 出现两条底部导航栏；同时需要可重复的 COS 发布步骤。
- 修改：去掉塔罗页 `hideTabBar`/`showTabBar`；`custom-tab-bar` 在本页路由为塔罗时用 `tabbar--hidden` 自隐；新增 `scripts/publish-assets.mjs`、`scripts/with-asset-env.mjs`、`docs/features/cos-assets.md`；根 `package.json` 增加 `assets:check`/`assets:upload`/`assets:publish`，构建自动读 `.asset-base-url`。
- 未修改：塔罗资源仍不进主包；未改 COS 密钥与真实上传。
- 验证：`npm test -- src/features/tarot/MiniappTarotFlow.styles.test.ts src/config/appConfig.test.ts src/config/assetPublish.test.ts` 通过（22 项）；`npm run build:weapp` 成功。未在微信开发者工具真机点过双栏回归。

## 2026-09-07 15:10 (UTC+8)

- 原因：需要一条命令完成 COS 校验、上传和重建，避免分步执行。
- 修改：`scripts/publish-assets.mjs` 增加 `--build` 与 COS 凭据预检；根 `package.json` 增加 `assets`；新增 `一键上传.cmd`；更新 `docs/features/cos-assets.md`、`docs/features/miniapp-kit.md` 与 `assetPublish.test.ts`。
- 未修改：未执行真实 COS 上传（本地 `art/generated-art/tarot` 仍缺 24 张）。
- 验证：`npm test -- src/config/assetPublish.test.ts` 通过；`npm run assets:check` 按预期列出缺失 24 张并退出。未做真实 COS 上传。

## 2026-09-07 16:05 (UTC+8)

- 原因：需要可按的腾讯云建桶步骤，并把 Pet10 塔罗原图落到本地后只做一次 TinyPNG。
- 修改：从 `D:\Pet10\public\tarot` 拷贝 24 张到 `art/generated-art/tarot/`（不入库）；新增 `scripts/compress-art.mjs` 与 `npm run assets:compress`（默认只压 tarot，不降分辨率）；`docs/features/cos-assets.md` 补建桶、密钥、合法域名与画质说明。
- 未修改：未配置 COS 密钥，未执行上传。首次压缩误扫到 `art/generated-art` 其它中间图，已立刻改回只压 tarot。
- 验证：`assets:check` 24 张齐全；像素仍为 768×1152 / 900×1350；TinyPNG 共少约 460KB；`assetPublish.test.ts` 通过。

## 2026-09-07 16:35 (UTC+8)

- 原因：双击 `一键上传.cmd` 时 UTF-8 中文被 cmd 按系统编码拆坏，把 `COS_SECRET_ID` 当成命令执行。
- 修改：`一键上传.cmd` 改为纯 ASCII；`assetPublish.test.ts` 锁定该文件不含非 ASCII；`docs/features/cos-assets.md` 注明原因。
- 未修改：未再次执行真实 COS 上传。
- 验证：`npm test -- src/config/assetPublish.test.ts` 通过。
