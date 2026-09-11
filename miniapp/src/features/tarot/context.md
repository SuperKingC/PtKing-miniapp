# 塔罗动效偏好工作记录

- 2026-09-11 21:20：开场四项修复(648340d)。①底栏随帘即藏：`startFlow` 先 `trigger(TAROT_FLOW_VISIBILITY_EVENT, true)` 再开帘，不等帘后流程挂载。②加载快进：HOLD_MIN 500→160ms。③开场精致化：clay 顶部帷幔(三扇贝垂边+双垂穗 `tarot-tassel-sway` 摇摆)+三重竖褶；classic 双流星+星座连线+月牙+halo；加载宝珠环(环轨旋+环心pct)+宝石胶囊条，文案分皮肤。④头部下移(header 12→44rpx、progress padding 加倍、阶段 padding-top 88→60rpx)，牌组对准圆环中心(y≈53%)。⑤**重要平台坑**：WXSS 同节点 class 切换(`--holding`→`--opening`)的 opacity keyframes 动画实测**不重放**——类挂上后帘幕仍不透明残留到 12s 兜底；修复=opening 700ms 后 `setCurtain('idle')` 卸载节点，卸载是确定性清屏兜底。后续凡「class 切换触发的整层淡出」都应优先考虑卸载式而非依赖动画重放。探针定位套路：bundle 变量撞名(tt=页面 curtainLoaded 也=Flow loadError)会误导静态分析，须用 console 监听+逐 300ms class 轮询在运行时取证。

- 2026-09-11 20:20：三项体验修复(4c67af8)。①tab选中态偶发不切换：tabbar 实例晚于页面 onShow 订阅的竞态——`useTabBarSelected` onShow 时也落乐观 storage(key 从 index.tsx 挪到 tabBarVisibility.ts 叶子模块，防 hook↔组件循环引用)+广播后 160ms 守卫式补发(仅栈顶页才发)；tabbar 挂载 120ms 后重解 ownRoute 校准。②流程内底栏残留：`shouldHideCustomTabBar` 改 ownRoute 优先——塔罗实例 flowOpen 即藏，不再信可能过期的 selected(新实例挂载读旧 storage)。③牌组居中背景圆环：金环量测 y 31%..75% 中心 53%，顶部 spacer 2:1→3:2。④帘幕开场重做：合拢 0.9s + 布帘竖向褶皱(clay)；classic 星星逐颗 pop 连线成星座 + halo 呼吸光；帘内预加载进度条(Flow 新增 onLoadProgress/onLoadDone 外抛)，hold 等 loaded(最短 500ms 仪式感，12s 慢网兜底)后整帘淡出(替代横向拉开)。契约测试同步，427 全过；automator 实机：tab 连续切换 5 次高亮正确、两皮肤帘幕三连拍、洗牌页圆环居中确认。注意：流程内提问页布局为居中表单不受 spacer 影响；me 页未接 useTabBarSelected(点击乐观值已兜底)。

- 2026-09-11 19:05：四仪式阶段(洗牌/切牌/选牌/翻牌)布局整体下移(用户反馈牌与标题偏高)。`MiniappTarotFlow.scss` ritual/fan/reveal 共享节奏 `padding-top` 24→88rpx(标题离开进度条),新增 `.miniapp-tarot__spacer--top`(flex-grow 2 + min-height 88rpx,上spacer多长使牌组落到中线偏下);四个 Stage 组件顶部 spacer 挂 `--top` 修饰类,提问页(居中表单)不动。契约测试断言同步(88rpx + spacer--top)。vitest 契约 16 过、全量 425/426(唯一失败 shareWiring 为工作区既有 app.scss 未提交改动所致,与本任务无关);清缓存重建后 automator 实机五图验收(shuffle/cut/fan/reveal/reveal-flipped)。

- 2026-09-11 18:20：入口已选牌阵时跳过流程内选牌阵阶段。`tarotFlow.ts` 的 `continue` 事件带 `chooseSpread?: boolean`（仅显式 false 跳过，缺省保持完整流程），`restart` 事件携带牌阵（顺带修复再占一次把三牌阵重置回单牌的问题）；`MiniappTarotFlow.tsx` 新增 `chooseSpread` prop（默认 true），进度条只画实际经过的阶段，问题页按钮文案随之切「下一步 · 洗牌/选牌阵」；`pages/tarot/index.tsx` 的 `startFlow(spread, withSpreadStage)`——抽取今日指引保留选牌阵，单张指引/三牌牌阵两张入口卡传 false。vitest 424 全过，automator 模拟器实测两条路径 5 项断言全过。

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
