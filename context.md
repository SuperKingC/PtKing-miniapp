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

## 2026-09-07 14:33 (UTC+8)

- 原因：先用回归契约锁定条件雷达 Canvas ID 冲突与解锁后的绘制触发。
- 修改：`miniapp/src/config/testFlow.test.ts` 增加因素/人格雷达唯一 ID、选择器对应关系及锁定/解锁绘制依赖断言；暂未修改业务实现。
- 工具说明：当前环境未提供 apply_patch，使用专用精确替换工具；保留根日志已有内容与其它任务改动。

## 2026-09-07 14:34 (UTC+8)

- 原因：保证塔罗资源加载失败时用户既能重试，也能离开全屏遮罩。
- 修改：`miniapp/src/features/tarot/MiniappTarotFlow.styles.test.ts` 新增失败分支内重新加载按钮、可访问退出按钮及 onClose 接线契约；暂未修改业务实现。
- 先行验证：依赖安装后运行两份聚焦测试，新增断言按预期失败（雷达 ID 重复、失败分支缺少退出按钮），其余 18 项通过。

## 2026-09-07 14:28 (UTC+8)

- 原因：修复动态题库未在启动时加载、加载后首页不刷新，并确保 COS 故障静态兜底。
- 修改：`miniapp/src/services/dynamicTests.test.ts` 先补版本化资产根、有限超时、HTTP 状态、异常结构、静态兜底、迟到响应、注册表订阅与卸载清理、启动/首页接线聚焦测试。
- 范围：仅动态加载与首页订阅，不改题库内容或视觉样式；保留其他并行改动，不提交。
- 修改：`miniapp/src/services/dynamicTests.ts` 增加 8 秒请求超时常量，为网络失败兜底设定明确上限。
- 检查：`npm test -- src/services/dynamicTests.test.ts` 退出码 1，环境未安装可用 vitest；未自行安装依赖，测试运行待统一环境就绪。
- 修改：`miniapp/src/services/dynamicTests.ts` 实现 8 秒平台与计时器双重超时、HTTP 200 校验和迟到响应忽略；`miniapp/src/services/testRegistry.ts` 添加订阅/取消订阅接口；`miniapp/src/app.tsx` 引入动态加载及共享资产根 API；`miniapp/src/pages/test/index.tsx` 引入订阅生命周期所需 useEffect。
- 修改：`miniapp/src/services/testRegistry.ts` 合并完成后通知订阅者；`miniapp/src/app.tsx` 在启动 effect 中使用 resolveAssetBaseUrl() 异步加载题库；`miniapp/src/pages/test/index.tsx` 引入订阅接口；`miniapp/src/services/dynamicTests.test.ts` 将测试定义分类收窄为合法字面量类型。

## 2026-09-07 15:10 (UTC+8)

- 原因：把已写好的契约测试补成可运行实现，恢复被中断的体验修复。
- 修改：`miniapp/src/pages/test/index.tsx` 订阅注册表并刷新卡片；`miniapp/src/services/testDrafts.ts` 落地草稿签名/过期/续答弹窗；`miniapp/src/pages/test-play/index.tsx` 逐题保存、完成后清理、进度按当前题号；`miniapp/src/pages/test-report/index.tsx` 拆分雷达 Canvas ID；`miniapp/src/features/tarot/MiniappTarotFlow.tsx` 与 scss 增加失败态退出；`miniapp/src/services/wxGlobal.ts` 补充 showModal；`miniapp/src/pages/records/index.tsx` 更正清空入口文案。
