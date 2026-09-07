# 工作记录

- 时间：2026-09-07 14:28
- 原因：为答题草稿保存恢复先补充服务层聚焦测试。
- 修改文件：`miniapp/src/services/testDrafts.test.ts`，新增草稿往返、内容签名错配、有效期、答案索引校验、存储异常静默与完成清理测试。

- 时间：2026-09-07 15:08
- 原因：落地答题草稿服务、首页动态题库刷新、报告雷达唯一 ID 与塔罗失败退出。
- 修改文件：`miniapp/src/services/testDrafts.ts` 新增草稿签名/过期/续答弹窗；`miniapp/src/pages/test-play/index.tsx` 逐题保存、完成后清理、进度按当前题号；`miniapp/src/pages/test/index.tsx` 订阅注册表刷新；`miniapp/src/pages/test-report/index.tsx` 雷达画布拆成 factor/archetype 两个 ID；`miniapp/src/features/tarot/MiniappTarotFlow.tsx` 与 scss 增加失败态退出；`miniapp/src/services/wxGlobal.ts` 补充 showModal。

