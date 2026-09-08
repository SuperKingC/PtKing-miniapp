# 塔罗动效偏好工作记录

- 2026-09-08 18:10：解读记录可点进完整详情；洗牌长按连续震动，抽牌/切牌/翻牌/进入解读按强度触感。新增 `MiniappTarotReadingBody.tsx` 供结果页与历史详情复用。`MiniappTarotHistoryPanel.tsx` 增加选中态、ScrollView 与「查看详情 / 返回记录」。`MiniappTarotFlow.tsx` / `MiniappTarotShuffleStage.tsx` 接入 haptics。`MiniappTarotFlow.scss` 历史面板改为固定高度滚动，详情里牌面略缩小。契约测试覆盖详情与震动接线。

- 2026-09-08 10:01：收口 tsc：eventCenter 清理改语句块、解读态先收窄再读 reading、飞牌 `--fly-x` 断言、资源测试 wx mock 类型。
- 2026-09-08 09:50：去掉用户可见「占卜」措辞；重试先重置 `resourcesLoaded`；失败只给重试/退出，不进七幕，不加纯文字模式。
- 2026-09-07 20:05：为本机动效偏好先补测试。新增 `miniapp/src/services/motionPreference.test.ts`，覆盖系统默认、三档保存、失败不广播、订阅清理和我的/塔罗接线契约。本记录文件为本任务独占；不修改根 context，不改抽牌与流程计时。环境缺失 apply_patch，使用专用编辑工具替代。
- 2026-09-07 20:10：新增 `services/motionPreference.ts`，守卫本地三档持久化并只在成功保存后广播；新增 `hooks/useMotionPreference.ts` 订阅跨常驻页偏好。修改 `pages/me/index.tsx` 导入、状态、保存处理与三档选项，保留震动成功/失败逻辑，说明简洁不减少塔罗流程。先运行新测试确认缺实现报红，再开始实现。
- 2026-09-07 20:12：`pages/me/index.tsx` 说明复用现有 foot 样式，无需扩大 CSS 修改范围；`MiniappTarotFlow.tsx` 导入并调用 hook，在根 View 挂 motion-system/standard/reduced 类名，未修改舞台推进回调或计时。
- 2026-09-07 20:13：`MiniappTarotFlow.scss` 开始加入简洁动效覆盖，检查显式标准对系统媒体查询的优先级，随后收敛为共享 mixin 防止误覆盖标准动画。
- 2026-09-07 20:15：将塔罗样式整理为 `tarot-reduced-motion` mixin：手动简洁模式固定短视觉时长；跟随系统仅在 `prefers-reduced-motion: reduce` 时启用；标准模式不会被覆盖。
- 2026-09-07 20:20：`motionPreference.test.ts` 修正 afterEach 的 void 返回。聚焦测试 10 文件 47 项通过；全局 tsc 暴露多个现有/并行改动类型问题，未越界修改。全局 diff-check 指出 testRecords.ts 尾随空格，已交父任务；本任务不构建共享 dist，由父任务汇总后清缓存重编译、微信预览。
- 2026-09-07 20:20：审查失败策略：preloadTarotResources 要求全资源可用，图片展示失败仅 Card 内已有牌名/符号兜底。新增文字流程需设计背景/牌背/选牌的显式降级入口，不能简单静默跳过预加载；本次延期，不改随机抽牌或失败策略。
