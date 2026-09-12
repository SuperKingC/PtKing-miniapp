# 底栏图标 v18 五组候选方案（2026-09-12）

任务：底栏除「记录」外的三枚 tab（测试/塔罗/我的）重新生图，每 tab 两状态（未选中/选中）——
共 6 个槽位。产出 **5 组渲染方向 × 6 槽位 = 30 张**候选，供用户挑一组。

`记录`(records) 本轮**未动**，仍未改动的现行 v17s 包内图，在各对照图里作为「同质基准」参考。

## 先看哪张

| 图 | 用途 |
|---|---|
| [`sheets/overview.png`](sheets/overview.png) | **总览**：行=5 方案，列=6 槽位，一眼挑组 |
| [`sheets/mock-tabbar-5up.png`](sheets/mock-tabbar-5up.png) | **实景**：5 条真实比例底栏（测试选中），看新三枚与保留的「记录」是否同质 |
| `sheets/dir-<id>.png` | 单方案放大：3 tab × 2 状态，看一组内部是否同构 |
| `sheets/slot-<tab>-<state>.png` | 单槽位五方向横排，逐槽比选 |
| `sheets/mock-<id>.png` | 单方案放大实景底栏 |

## 五组方向

| id | 名称 | 一句话 |
|---|---|---|
| v18a | A 现版精修·高对比 | 沿用现行配色逻辑，只把主体加深两档拉开与胶囊对比，细节中等 |
| v18b | B 暖陶土甜暖 | 整体更暖更甜，烤杏焦糖色，选中像刚出炉的饼干 |
| v18c | C 粉雾蓝清凉 | 主体改粉雾蓝配奶油白，选中被暖橘小夜灯点亮，冷底暖光 |
| v18d | D 厚体积胖软陶 | 造型更圆润厚重饱满，体块感与接触影更强 |
| v18e | E 极简符号 | 细节减到最少，大色块圆角剪影 |

造型概念（猫探头/叠牌月牙/坐姿猫）沿用 `docs/features/miniapp-kit.md` 锁定项，**只改渲染语言**，
这样五组之间可比且不推翻已验收的造型。

## 流水线（与 tabbar-v14s 同款）

```
node compose-prompts.mjs          # 生成 prompts.txt（概念 × 状态 × 5 方向 = 30 条）
node generate.mjs --dry-run       # 免费校验提示词组装
node generate.mjs                 # 出图（kit gen，gpt-5.4-image-2，2K，--ref 风格锚）
python prepare-v18.py             # 泛洪抠透明 → 最大连通域清理 → 统一高度 130 归一到 162 画布
python contact-sheets.py          # 方案/槽位/总览对照图
python mock-tabbar.py             # 实景底栏对照
```

- 风格锚：`../ref-pages-v3/reference-ui.png` 缺盘（脚本自动退 `style-ref.local.jpg`，来自 v14s）。
- 候选稿不落包、不过 TinyPNG（`generated/` 为 2K 原图）；选定后才需压缩落 `src/assets/tabbar/`。
- 重新出图：`node generate.mjs --only v18a`（子串匹配，已有图也强制重生）。

## 落地注意（选定后）

1. 包内图与页面插画须走 `compress-tabbar.mjs` 同款 TinyPNG（≤180KB）落 `src/assets/tabbar/`。
2. **换同路径图片必须升文件名防缓存**（v18→v19），同步改 `app.config.ts` 与 `custom-tab-bar/index.tsx` 的 import。
3. 视觉改动需用户验收后才能合 `main` / 部署（AGENTS.md）。

## 成本

30 张 × gpt-5.4-image-2，本轮 **$14.65**（约 19 分钟，3 并发；明细见 `generated/manifest.json`）。
