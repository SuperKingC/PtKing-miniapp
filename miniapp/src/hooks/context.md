# 工作记录

- 时间：2026-09-09 16:30
- 原因：深色模式切换后切 tab，标题栏仍是浅色。
- 修改：`useAppTheme.ts` 在 `useDidShow` 里 force 重刷导航栏底色。

- 时间：2026-09-08 10:48
- 原因：主题不再跟随系统。
- 修改：`useAppTheme.ts` 注释改为 light/dark 手动偏好。
