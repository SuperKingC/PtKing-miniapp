# 功能：测试引擎与 MBTI 全流程（M1）

状态：已落地（代码与测试全绿，待用户开发者工具预览验收）

## 目标

通用测试引擎驱动全部心理测试；MBTI 作为首个测试全流程跑通：
测试中心 → 详情页 → 答题页 → 报告页 → 记录页回看。

## 实现

- `domain/testEngine.ts`：`TestDefinition` + 四种计分模式纯函数——
  `dimension`（维度二分多数票定字母拼 reportId，同票取第一极）、`band`（权重求和落区间）、
  `archetype`（选项投票最高票人格，同票按定义序；同时返回全部类型票数分布 `archetypeVotes`
  供报告页画「人格倾向分布」，旧记录无此字段读侧须 `?? []` 兜底）、
  `factor`（因素加权百分位，反向因素取反）。答案长度/下标严格校验；
  reportId 命不中 reports 一律抛 `invalid_test_definition:*` 不静默兜底。
  另导出：`MIN_QUESTIONS = 12`（上架最少题数基准，2026-09 定：题太少用户觉得「不准」，
  静态 sanity 与 COS 新内容共同遵守）、`findBandIndex`（band 报告页刻度高亮）、
  `radarChartGeometry`（雷达图顶点几何纯函数，canvas 绘制层用）。
- `domain/tests/*.ts`：17 个测试全部 ≥12 题（2026-09 起 8/10 题的 13 个测试补齐到 12，
  band 测试满分统一重算为 36 分、三档 0-12/13-24/25-36；MBTI 28 / 大五 30 / 暗黑 27 / 宠物 12 原有不动）。
- `services/testRegistry.ts`：静态注册表 + `TEST_LIST_ORDER` 展示顺序，页面数据驱动；
  M2 COS 下发新测试时此文件只加兜底条目。
- `services/testRecords.ts`：本地 storage 记录（`ptking_test_records`，上限 200，最新在前）；
  getStorageSync 空串 typeof 守卫（Pet10 698990d 同款坑）；坏数据丢弃不抛错。
  存储契约：写侧 JSON.stringify、读侧 parse 只认字符串。
- 页面：`pages/test`（中心，卡片接注册表+敬请期待占位卡）、`pages/test-detail`
  （信息胶囊+介绍+注意卡+开始按钮）、`pages/test-play`（进度条+计数+自适应答案卡：
  2 选项横排大卡、3+ 选项长文本纵向堆叠全宽卡+A/B/C/D 徽标，支持回退改答案）、
  `pages/test-report`（hero 渐变结果卡+徽章行；图表随计分模式切换——dimension 双端百分比
  维度条 / factor canvas 雷达图+百分位条 / archetype 票数分布条+次人格卡 / band 三档分数
  刻度条+得分徽章；摘要+解读+再测一次）、`pages/records`（记录列表回看）、
  `pages/me`（已做测试入口 → 记录 tab）。

## 导航链路

中心页 navigateTo 详情（?testId=）→ navigateTo 答题 → redirectTo 报告 → switchTab 回中心；
记录页 navigateTo 报告（读最近一条该测试记录）。

## 验证

- vitest 38/38：引擎 10（三模式+非法输入）、MBTI 7（结构/16 型/极化答案/品牌词）、
  记录 7（空串守卫/坏数据/截断）、appConfig 5、testFlow 5（导航链路/架构边界）、assetBaseUrl 4。
- 构建 7 页 dist 365KB（主包红线 2MB，余量 1.75MB）。
- 待验收：开发者工具导入 `miniapp/`，预览 MBTI 测全流程与记录回看。

## 付费位预留

详情页 notice 文案已按「免费测+看报告」口径；M4 支付解锁深度报告时在报告页加遮罩+解锁按钮。
