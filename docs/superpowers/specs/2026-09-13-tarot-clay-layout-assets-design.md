# 测测子塔罗牌桌布局与资源修复设计

日期：2026-09-13  
范围：`miniapp/src/features/tarot` 与 `miniapp/src/pages/tarot` 的 clay 皮肤视觉与资源接线

## 目标

修复测测子（clay）模式的四个视觉问题：

1. 限定牌（已选牌槽）应位于水晶球底座下方合适距离，采用已确认的 B 方案。
2. 限定牌下方的按钮与状态/辅助文案统一靠近牌组，避免不同阶段间距漂移。
3. clay 塔罗流程切换到用户确认的最新长幅背景候选“背景 2”。classic 皮肤保持现有背景。
4. 使用用户确认的牌背候选 v2r1；洗牌、切牌、抽牌候选、已选槽与翻牌前统一使用同一资源，完整显示，不裁切边框。

## 非目标

- 不修改 classic 皮肤的色板、背景、牌背或动画节奏。
- 不修改塔罗抽牌、计分、解读、历史存储等领域逻辑。
- 不重排问题输入、牌阵选择、解读页等非仪式阶段布局。
- 不把塔罗运行时图片复制进小程序主包；资源仍由 COS 资产根热更下发。

## 已确认的视觉选择

- 间距：B。限定牌与水晶球底座保留约 `12–16rpx` 视觉间隔，牌组到按钮/文案保留约 `16rpx`。
- 背景：背景 2（`art/generated-art/tarot-bg-long/tarot-bg-long2.png`）。该图为 1440×2560 长幅软陶猫咪牌桌场景，保留猫、球和桌面牌区的均衡比例。
- 牌背：v2r1（`art/generated-art/tarot-cardback-v2r/tarot-clay-cardback-v2r1.png`）。边框完整、中央徽记适中，适合缩小后复用。

## 根因与设计

### 1. 资源键与版本

当前 `getTarotSanctuaryBackground('clay')` 仍返回旧的 `sanctuary-background-clay.jpg`，因此运行时不会看到最新长幅背景。新增带版本号的 clay 背景文件名并在 getter 中切换，避免覆盖同路径缓存。

当前 `getTarotCardBack('clay')` 返回旧的 `card-back-clay.jpg`。新增带版本号的 v2r1 文件名并切换 getter；`getTarotResourceUrls` 自动纳入新 URL，预加载/缓存逻辑不变。

新图由现有 art/kit 生成候选提供，代码只接线与压缩发布，不在仓库中手工重绘。发布前按资产规则将运行时尺寸降到手机所需分辨率并压到单图 ≤180KB，仍由 `assets:compress`/COS 发布流程处理。

### 2. 牌背完整显示

所有牌背消费者（洗牌堆、切牌面、抽牌候选、已选槽）继续共享 `getTarotCardBack(skin)`，但图片显示模式改为完整比例（`aspectFit`），并让包含牌背的容器保持统一的卡片宽高比。单牌已选槽不再用不成比例的 `176×150rpx` 压扁；clay 的短屏覆盖也只缩放整张槽位，不改变图像裁切规则。

翻牌组件的背面同样使用该 getter 与完整比例显示；牌面仍按现有规则渲染，避免影响正逆位与解读。

### 3. B 方案的布局节奏

在 clay 仪式阶段建立明确的布局 token/覆盖值：

- 上 spacer 的终点让牌组落在场景中水晶球底座以下约 `12–16rpx`；
- 牌组容器、提示文本与主按钮之间使用固定小间距（约 `16rpx`），不再依赖下方弹性 spacer 吸收所有剩余空间；
- 洗牌、切牌、抽牌候选、翻牌四阶段使用同一套节奏；五牌牌阵仅保留现有紧凑牌尺寸。

保持短屏兜底：牌组和按钮 `flex: none`，必要时先缩短上 spacer 或整组按比例缩放，不能把按钮压成 0 高，也不能让牌溢出阶段裁剪。

### 4. 飞牌尺寸与终点

抽牌阶段飞牌动画的起点是候选牌尺寸，终点是已选槽尺寸。为避免现有固定 `scale(1)` 在单牌/五牌牌阵下失配，动画终点使用 clay 专用变量：位移将牌中心对准对应槽位中心，终点缩放按槽位与候选牌的宽高比计算，并保持完整牌背可见。中段只做轻微放大（不超过 1.08），不改变牌背比例。

## 数据流与边界

```
art/kit 候选图
      │ 资产压缩 / COS 版本目录
      ▼
tarotAssets getter ──► preloadTarotResources / cache
      │
      ├─► MiniappTarotFlow 场景背景
      └─► Card / Shuffle / Cut / Fan 的统一牌背 URL

MiniappTarotFlow.scss（clay 覆盖）
      ├─► 水晶球与牌组垂直关系
      ├─► 牌组与按钮/文本间距
      └─► 飞牌位移与缩放变量
```

UI 组件仅负责渲染现有状态与交互；资源 URL 仍由 `tarotAssets`/缓存服务维护；领域 reducer 与牌阵计算不改。

## 测试与验收

先补聚焦契约测试再改实现：

- `tarotAssets.test.ts`：clay 背景与牌背 URL 含新版本文件名，classic URL 不变，资源清单仍为 24 张。
- `MiniappTarotFlow.styles.test.ts`：四个牌背消费者使用完整比例显示；clay 统一间距 token、牌组/按钮不允许被 flex 压缩；飞牌变量覆盖存在且终点缩放不为固定 1。
- 必要时在 `MiniappTarotShuffleStage.test.ts` 增加共享牌背 URL 的组件契约。

验证顺序：

1. 先运行新增/修改的 vitest 单文件，确认测试先红后绿。
2. 运行 `npx vitest run src/features/tarot src/pages/tarot`。
3. 运行 `npm run build:weapp`，确认 `miniapp/dist` 重新生成且资源根注入正确。
4. 清缓存后在微信开发者工具导入 `D:\Mine\PtKing-miniapp\miniapp`，检查 clay 四阶段：背景 2、统一 v2r1 牌背、牌不裁剪、限定牌与球座/按钮间距、飞牌尺寸；同时回归 classic。
5. 视觉验收通过后再执行资产压缩/发布；本次不自动上传 COS 或合并 `main`。

## 完成标准

- clay 背景与 v2r1 牌背在所有阶段均来自新版本资源 URL。
- 牌背边框在不同阶段与不同牌阵下均完整可见，未被 `aspectFill` 裁切。
- 限定牌位于水晶球下方约 `12–16rpx`，牌组与按钮/文本间距在四阶段一致。
- 飞牌落槽时尺寸与目标槽匹配，不越过槽位、不被阶段裁剪。
- 聚焦测试、塔罗测试与 weapp 构建通过，微信开发者工具清缓存后可复现最新构建。
