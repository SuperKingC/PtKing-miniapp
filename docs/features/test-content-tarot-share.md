# 功能：测试内容扩量、塔罗平移与分享（M2+M3+M4）

状态：已落地（代码与测试全绿，待用户开发者工具预览验收）

## M2 测试内容扩量

- 新增 4 个测试定义（`domain/tests/`）：
  - `lovePersonaTest.ts` 恋爱人格：8 题 archetype 4 型（护花使者/浪漫理想/理性评估/自由灵魂）
  - `giftTest.ts` 天赋能力：8 题 archetype 4 型（创造力/共情力/逻辑力/行动力）
  - `overthinkTest.ts` 内耗指数：8 题 band 3 档（0-8/9-16/17-24）
  - `sleepTest.ts` 睡眠质量：8 题 band 3 档（0-7/8-15/16-24）
- 注册表 `services/testRegistry.ts` 扩为 5 测试静态兜底；`TEST_LIST_ORDER` 即首页卡片顺序。
- **COS 动态下发**：`dynamicTests.ts` 拉取 `{资产根}/tests/registry-v1.json`（升版本号防缓存），
  `testRegistryMerge.ts` 纯函数合并（动态覆盖静态同名项、新 id 追加列表尾、半残结构丢弃）；
  加载失败静默走静态兜底，产品永不受 COS 故障影响。
- **sanity 契约**（`config/testRegistrySanity.test.ts`）：对所有上架测试自动检查——
  结构完整（题数≥6/报告≥3/文案长度）、三类计分模式报告可达性（极化/均匀答案能命中每个报告）、
  品牌词与临床措辞禁令（小多利/Pet10/诊断/抑郁症等）。新加测试自动纳入，无需补写。

## M3 塔罗平移

- Pet10 `features/tarot` 整目录 25 文件（7 幕流程组件+域逻辑+8 个测试文件）平移。
- 解耦改造三处：
  1. `MiniappTarotFlow.tsx` 去 roomApi：聊天室分享改为 `setClipboardData` 复制解读文本；
  2. `tarotHistory.ts`：storage key 改 `ptking_tarot_history`，改守卫式 wx 全局读取
     （模块顶层不再 import Taro，node/vitest 可直接 import），`parseTarotHistory` 纯函数校验；
  3. `MiniappTarotFlow.styles.test.ts` 契约测试改指本仓库 `pages/tarot/index.tsx`。
- 页面挂载：`pages/tarot/index.tsx` fixed 全屏容器（WXSS 显式四边+显式宽高），
  深色导航栏，退出按钮 switchTab 回测试中心；资产沿用 COS `{根}/tarot/` 前缀。

## M4 分享

- `app.tsx` 启动调 `services/shareMenu.ts` 的 `showShareMenu()`（守卫式 wx，失败静默）。
- 报告页 `useShareAppMessage`：带结果型标题「我在 XX 里测出了「YY」，你也来试试」。
- 塔罗页：解读阶段动态注册塔罗风味分享标题（Pet10 同款联动）。
- 契约测试 `config/shareWiring.test.ts` 锁定三处接线。

## 验证

- vitest 98/98 全绿（18 文件）：塔罗迁移 34、sanity 30、引擎 10、MBTI 7、合并 3、
  COS loader 3、记录 7、分享 3、appConfig 5、资产 4 等。
- 构建 7 页 dist 470KB（主包红线 2MB）。塔罗 wxss/图标已核对入包。
- 待验收：开发者工具导入 `miniapp/` 预览——五个测试全流程、塔罗七幕、记录回看、
  报告页转发标题（开发者工具「转发」模拟）。

## 内容口径红线（合规）

塔罗文案禁「占卜/算命/改运」；量表类文案禁「诊断/筛查/治疗」；
全部测试 notice 保持「免费测试+查看报告」口径（付费解锁 M4+ 视资质再启）。
