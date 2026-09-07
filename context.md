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

## 2026-09-07 14:20 (UTC+8)

- 原因：记录容量提示仍指向已经移除的设置入口。
- 修改：`miniapp/src/pages/records/index.tsx` 将清空指引改为「我的 → 清空测试记录」，同步注释。

## 2026-09-07 12:15 (UTC+8)

- 原因：COS 未配置时塔罗页仍可进入，且下载失败被当作成功，导致手机端资源空白。
- 修改：`miniapp/src/features/tarot/tarotAssets.ts` 严格校验下载 HTTP 状态并返回失败资源；`miniapp/src/features/tarot/MiniappTarotFlow.tsx` 增加失败闸门、重试和异步请求失效保护；`miniapp/src/features/tarot/MiniappTarotFlow.scss` 增加失败提示与重试按钮样式；`miniapp/src/features/tarot/MiniappTarotFlow.styles.test.ts` 增加资源失败不放行契约断言；`miniapp/src/features/tarot/tarotAssets.test.ts` 覆盖非 200 响应必须被视为资源失败。
- 未修改：塔罗资源仍放在 COS，未迁入本地包；COS 地址和资源路径未改变。
- 验证：`npm test -- src/features/tarot/tarotAssets.test.ts src/features/tarot/MiniappTarotFlow.styles.test.ts` 通过（18 项）；`npm run build:weapp` 成功，`miniapp/dist` 为 1.69 MiB，未包含塔罗资源。

## 2026-09-07 14:28 (UTC+8)

- 原因：修复动态题库未在启动时加载、加载后首页不刷新，并确保 COS 故障静态兜底。
- 修改：`miniapp/src/services/dynamicTests.ts` 实现 8 秒超时与 HTTP 200 校验；`testRegistry.ts` 增加订阅；`app.tsx` 启动加载；首页订阅刷新。

## 2026-09-07 14:33 (UTC+8)

- 原因：先用回归契约锁定条件雷达 Canvas ID 冲突与解锁后的绘制触发。
- 修改：`miniapp/src/config/testFlow.test.ts` 增加因素/人格雷达唯一 ID、选择器对应关系及锁定/解锁绘制依赖断言。

## 2026-09-07 14:34 (UTC+8)

- 原因：保证塔罗资源加载失败时用户既能重试，也能离开全屏遮罩。
- 修改：`miniapp/src/features/tarot/MiniappTarotFlow.styles.test.ts` 新增失败分支内重新加载按钮、可访问退出按钮及 onClose 接线契约。

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

## 2026-09-07 16:40 (UTC+8)

- 原因：真机资源加载失败后切到记录页仍叠两条自定义 tab 栏；后台 tab 页的 `position:fixed` 实例不会随 switchTab 销毁。
- 修改：新增 `shouldHideCustomTabBar`，非当前页与塔罗页都隐藏；`custom-tab-bar` 用页面实例判断是否当前页；隐藏态补 visibility/宽高/pointer-events。
- 未修改：未再调用原生 hideTabBar。
- 验证：`npm test -- src/custom-tab-bar/tabBarVisibility.test.ts src/config/appConfig.test.ts src/features/tarot/MiniappTarotFlow.styles.test.ts` 通过（25 项）；`npm run build:weapp` 成功。真机双栏需用本次 `miniapp/dist` 预览确认。

## 2026-09-07 15:10 (UTC+8)

- 原因：把已写好的契约测试补成可运行实现，恢复被中断的体验修复。
- 修改：`miniapp/src/pages/test/index.tsx` 订阅注册表并刷新卡片；`miniapp/src/services/testDrafts.ts` 落地草稿签名/过期/续答弹窗；`miniapp/src/pages/test-play/index.tsx` 逐题保存、完成后清理、进度按当前题号；`miniapp/src/pages/test-report/index.tsx` 拆分雷达 Canvas ID；`miniapp/src/features/tarot/MiniappTarotFlow.tsx` 与 scss 增加失败态退出；`miniapp/src/services/wxGlobal.ts` 补充 showModal；`miniapp/src/pages/records/index.tsx` 更正清空入口文案。

## 2026-09-07 15:32 (UTC+8)

- 原因：并行整合后塔罗失败态出现两个退出按钮。
- 修改：`miniapp/src/features/tarot/MiniappTarotFlow.tsx` 只保留带 `miniapp-tarot__loading_exit` 的退出入口；`miniapp/src/features/tarot/MiniappTarotFlow.styles.test.ts` 增加单一退出入口断言。

## 2026-09-07 15:50 (UTC+8)

- 原因：按正式名测测子落地剩余可改优化，覆盖品牌、免责、首页续答推荐、报告分层、答题轻动效。
- 修改：新增 `miniapp/src/services/brand.ts`；用户可见 PtKing 改为测测子；隐私页入口对齐；首页增加继续答题与推荐；详情/报告增加娱乐化免责；报告深度内容默认折叠；答题增加切题动效与选项分布埋点；暗色 TabBar 图标略提亮。
- 未修改：未改存储键、COS 路径、仓库名；未重写整库题目；未走 kit 重出暗色 TabBar 资产。

## 2026-09-07 16:24 (UTC+8)

- 原因：继续优化发现效率与塔罗加载可逃。
- 修改：新增 `testDiscovery` 按近期记录推荐；首页搜索可匹配简介并一键清空；塔罗加载中可退出、预加载 20s 超时、洗牌间隔 90ms；答题短震动；记录页与我的页续答/塔罗历史入口；详情浏览埋点只记进入一次。
- 未修改：未改题库正文、存储键、kit 出图。

## 2026-09-07 16:45 (UTC+8)

- 原因：把 `feat/experience-recovery` 合进 `main`，保留 COS 发布与真机双栏修复。
- 修改：合并体验优化；`custom-tab-bar` 同时保留暗色图标提亮与 `--hidden` 卸栏。
- 未修改：未收编本地 `project.config.json` / 根目录微信工程文件。

## 2026-09-07 16:48 (UTC+8)

- 原因：按用户要求还原「真机切离塔罗时隐藏后台 tab 栏」(`96f6b9e`)。
- 修改：删除 `tabBarVisibility.ts` 与其测试；`custom-tab-bar` 恢复为仅在本页路由是塔罗时自隐；`.tabbar--hidden` 只保留 `display: none`。保留暗色图标提亮与塔罗可退出等后续体验改动。
- 未修改：未收编本地 `project.config.json` / 根目录微信工程文件；未再调用原生 hideTabBar。
- 验证：`npm test -- src/config/appConfig.test.ts src/features/tarot/MiniappTarotFlow.styles.test.ts` 通过（22 项）；`npm run build:weapp` 成功。未在微信开发者工具/真机点过双栏。

## 2026-09-07 17:10 (UTC+8)

- 原因：点「记录」后底栏消失；滑动右侧露出淡灰滚动条；真机塔罗停在「资源加载失败」。
- 修改：
  - `miniapp/src/custom-tab-bar/tabBarVisibility.ts` 按当前 webview 路由对选中 tab 路由判断显隐（不用页面对象身份），记录/测试/我的为当前 tab 时显示，塔罗与后台实例隐藏；`index.tsx` / `index.scss` 同步，隐藏态补 visibility/宽高。
  - `miniapp/src/pages/{test,records,me}` 改为 `disableScroll` + `ScrollView showScrollbar={false}`；`app.scss` 按微信约定隐藏 `::-webkit-scrollbar`。
  - `miniapp/src/features/tarot/tarotAssets.ts` 改走 `wx.downloadFile` 回调、接受 200 或临时路径、拒绝占位域名；超时 40s；`wxGlobal.ts` 补 downloadFile。
- 未修改：未收编本地 `project.config.json` / 根目录微信工程文件；塔罗图仍走 COS，未进主包。
- 验证：`npm test -- src/custom-tab-bar/tabBarVisibility.test.ts src/config/appConfig.test.ts src/features/tarot/MiniappTarotFlow.styles.test.ts src/features/tarot/tarotAssets.test.ts src/config/testFlow.test.ts` 通过（43 项）；`npm run build:weapp` 成功，产物已注入 `https://ptking-assets-1300973162.cos.ap-guangzhou.myqcloud.com/assets/ptking/06b0a05`。未在微信开发者工具/真机点过记录栏、滚动条和塔罗下载。真机仍需在公众平台把该 COS 主机名加入 downloadFile 合法域名。

## 2026-09-07 17:32 (UTC+8)

- 原因：测试页底栏上方被 100vh 裁切；滑动仍露灰条；塔罗紫罩过深、解读按钮仍是复制文案。
- 修改：
  - `miniapp/src/app.scss` 增加 `.tab-page` 按底栏高度让位，`.tab-page__scroll` 加宽 20rpx 把滚动条推出可视区；测试/记录/我的去掉 100vh。
  - `MiniappTarotFlow.scss` 背景图透明度 .62→.88，紫罩减淡。
  - `MiniappTarotReadingStage.tsx` 主按钮改为 `openType="share"`「分享给好友」，去掉复制解读。
- 未修改：未收编本地 `project.config.json` / 根目录微信工程文件。
- 验证：`npm test -- src/features/tarot/MiniappTarotFlow.styles.test.ts src/config/testFlow.test.ts src/config/shareWiring.test.ts src/config/appConfig.test.ts` 通过（35 项）；`npm run build:weapp` 成功。未在开发者工具/真机点过底栏裁切、灰条和塔罗分享。
