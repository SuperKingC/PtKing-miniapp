# 工作记录

- 时间：2026-09-11 12:50
- 原因：用户澄清答题页也不要系统标题栏，且此前顶距偏高（scss 兜底 88px 被 Taro 编成 88rpx 腰斩）。
- 修改：index.config.ts 撤掉 navigationStyle: default 回全局沉浸式；根节点内联注入 topInsetStyle()（实测 padding-top 95px，胶囊底边 83px）；加左上返回键（中途返回仍由 warnBeforeLeavingPlay 原生确认兜底）。

- 时间：2026-09-11 12:15
- 原因：用户澄清整体上移范围：答题页/报告页不上移，保留系统标题栏。
- 修改：`index.config.ts` 加 `navigationStyle: default` 恢复系统标题栏「测测子」；`index.scss` 顶部内边距从胶囊安全距离 `calc(var(--page-top-inset) + 8rpx)` 恢复为固定 `32rpx`。

- 时间：2026-09-09 16:30
- 原因：顶部标题统一为测测子。
- 修改：`index.config.ts` 导航标题改为「测测子」。

- 时间：2026-09-09 11:20
- 原因：答题选完立刻切题，没有确认节奏。
- 修改：`index.tsx` 选中后停 `PLAY_CONFIRM_MS` 再切题或出报告；续答弹窗前显示恢复遮罩；选项和导航加按压态。

- 时间：2026-09-09 11:20
- 原因：确认停顿让点选项要等一会才切题，用户要求立即。
- 修改：去掉 `PLAY_CONFIRM_MS` 延迟，选中后立刻切题或出报告；保留续答遮罩和按压态。
