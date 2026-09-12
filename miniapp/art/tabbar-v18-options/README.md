# 底栏图标 v18 候选方案（2026-09-12）

任务分四轮：

1. **五组渲染方向**：底栏除「记录」外的三枚 tab（测试/塔罗/我的）重新生图，每 tab 两状态
   （未选中/选中）——共 6 个槽位，产出 **5 组渲染方向 × 6 槽位 = 30 张**候选供挑。
   用户已选 **塔罗用 A 方向**，已落包（`v17s→v18s`，见提交 `141857f`）。
2. **「我的」猫坐姿重生 v1/v2**：现行 v17s 的猫是「拟人坐」，改成真猫坐姿（已废弃，见下节）。
3. **「我的」猫重生 v3**：在 v1/v2 基础上再改三点——**藏尾巴**、**脸/毛色对齐
   「测测子」角色**、**正对端正**。4 姿态 × 2 状态 = 8 张。
4. **「我的」选中态重生 v4**：选中要**抬起前爪、掌心粉色肉垫正对观者**（v3 选中只有笑脸）。
   3 份（齐耳/齐肩/过头）。用户选了 **b 的感觉**，但指出举错了手。
5. **「我的」选中态 v5**：沿用 v4b 感觉（爪举到胸/肩高、掌心朝观者），但改为**猫的左手**
   举起（画面右侧）。3 份。用户选了 **5b**。
6. **「我的」v6 五组完整方案（当前候选）**：以 5b 为基准重生的**五组完整方案**，
   每组 = 未选中 + 选中配对（选中=猫左手抬起+粉肉垫），挑定一组即可整体接包。
   **待确认，未接包**。

`记录`(records) 各轮都**未动**，仍是现行 v17s 包内图，在对照图里作「同质基准」。

## 先看哪张

| 图 | 用途 |
|---|---|
| [`sheets/me-v6-five-groups.png`](sheets/me-v6-five-groups.png) | **本轮主图（待确认）**：五组完整方案 × 两状态 + 角色锚 |
| [`sheets/me-v6-mock-tabbar.png`](sheets/me-v6-mock-tabbar.png) | **本轮实景**：五组底栏 + 现行对照（我的 tab 选中） |
| [`sheets/me-v6-realsize.png`](sheets/me-v6-realsize.png) | 真实 52px 尺寸下五组两状态对比（判断肉垫辨识度） |
| [`sheets/me-pose3-candidates.png`](sheets/me-pose3-candidates.png) | v3 主图：四姿态 × 2 状态 + 测测子角色锚 + 现行对照 |
| [`sheets/me-pose3-mock-tabbar.png`](sheets/me-pose3-mock-tabbar.png) | v3 实景：5 条底栏对照（我的 tab 选中） |
| [`sheets/overview.png`](sheets/overview.png) | 五组方向总览：行=方案，列=6 槽位，一眼挑组 |
| [`sheets/mock-tabbar-5up.png`](sheets/mock-tabbar-5up.png) | 五组方向实景：5 条真实比例底栏（测试选中） |
| `sheets/dir-<id>.png` | 单方案放大：3 tab × 2 状态，看一组内部是否同构 |
| `sheets/slot-<tab>-<state>.png` | 单槽位五方向横排，逐槽比选 |
| `sheets/mock-<id>.png` | 单方案放大实景底栏 |

## 五组方向

| id | 名称 | 一句话 |
|---|---|---|
| v18a | A 现版精修·高对比 | 沿用现行配色逻辑，只把主体加深两档拉开与胶囊对比，细节中等（**塔罗已选此组**） |
| v18b | B 暖陶土甜暖 | 整体更暖更甜，烤杏焦糖色，选中像刚出炉的饼干 |
| v18c | C 粉雾蓝清凉 | 主体改粉雾蓝配奶油白，选中被暖橘小夜灯点亮，冷底暖光 |
| v18d | D 厚体积胖软陶 | 造型更圆润厚重饱满，体块感与接触影更强 |
| v18e | E 极简符号 | 细节减到最少，大色块圆角剪影 |

造型概念（猫探头/叠牌月牙/坐姿猫）沿用 `docs/features/miniapp-kit.md` 锁定项，**只改渲染语言**，
这样五组之间可比且不推翻已验收的造型。

## 「我的」猫重生（v1→v2→v3，当前候选 v3 待确认）

**问题演进**

1. **v1**：现行 v17s 的猫是「拟人坐」——两前爪像抱臂交叉收胸前 + 前面叉开两条大圆腿，像泰迪/人坐。
   重生为真猫坐姿（前腿笔直并拢踩地、后腿折叠收身侧、臀部坐地），提示词加禁则
   （不要抱臂/不要叉腿/不要像人或泰迪熊）。5 姿态 × 2 状态 = 10 张。**已废弃**（用户新反馈）。
2. **v2**：追加用户三点要求——藏尾巴、脸/毛色对齐「测测子」角色、正对端正。4 姿态 × 2 状态 = 8 张。
   **已废弃**：白底不可抠（见下「关键教训」）。
3. **v3（当前候选）**：v2 三项要求保留，改用纯色对比底出图，解决抠图问题。8 张，**待确认**。

**关键教训（白底抠不出测测子猫）**

v2 在纯白底生成，抠图后轮廓撕裂、头顶杏色条纹变空心。根因：测测子猫身是奶油象牙白 `#f3ead9`，
**与白底色距仅约 43**，floodfill 容差 (`tol`) 低则残留近白描边（白晕），高则把身体边缘一起抠掉。
v3 对策（同 kit 指引「抠图底选主体色板里没有的纯色」）：改**柔和雾蓝灰 `#9fb4c2` 平涂底** +
明令**不要任何地面/接触阴影**（烘焙软影会与主体一起被保留成灰晕），抠图即干净。

**v3 已知权衡**：奶油身与底栏米色胶囊 `#f3e5d1` 色距仅约 **34**（现行橘猫约 110），
屏上对比明显更弱。这是「对齐测测子角色毛色」与「底栏辨识度」之间的取舍，
如需更跳可把身体加深一档（偏离角色稿），提交前请一并确认。

| 图 | 用途 |
|---|---|
| [`sheets/me-pose3-candidates.png`](sheets/me-pose3-candidates.png) | **主图**：行=4 姿态，列=两状态，末两行是角色锚与现行对照 |
| [`sheets/me-pose3-mock-tabbar.png`](sheets/me-pose3-mock-tabbar.png) | **实景**：5 条底栏（含现行对照），看真实尺寸下的观感 |

- v3 生成：`node compose-me-pose3.mjs && node generate.mjs --prompts prompts-me-pose3.txt --char char-ref.local.jpg`
- 归一：`python prepare-v18.py --only sit3 --force-matte`（`--tol` 可调，奶白主体需谨慎）
- 对照图：`python sheet-me-pose3.py`、`python mock-me-pose.py`
- 角色锚：`char-ref.local.jpg`（从 `hero-card-v9.png` 裁的测测子猫，gitignore）
- **用户选定后才接包**：`src/assets/tabbar/` 升名 + 改 `app.config.ts` / `custom-tab-bar` / `appConfig.test.ts`。

## 「我的」选中态 v4（已被 v5 取代）

v4 在 v3 全部设定之上,只重做**选中态**:抬起一只前爪打招呼,**抬起爪掌的粉色肉垫正对观者**
(一大块主垫 + 上方四枚小趾垫,粉色明显)。三份只差抬手高度:

| 候选 | 姿态 |
|---|---|
| sit4a | 前爪举到脸侧约齐耳高度,掌心疼在脸旁 |
| sit4b | 前爪举到肩膀高度,爪掌朝向观者 |
| sit4c | 前爪举过头顶像挥手,掌心正对观者 |

**实机尺寸提示**:52px 真实尺寸下 a(齐耳)与 c(过头)的粉色肉垫最清楚;b 的爪偏挡脸,pads 稍小。
选中态三份均无尾巴、无地面影、正对端正。

- 生成:`node compose-me-pose4.mjs && node generate.mjs --prompts prompts-me-pose4.txt --char char-ref.local.jpg`
- 归一:`python prepare-v18.py --only active-sit4 --force-matte`
- 对照图:`python sheet-me-pose4.py`
- 未选中态沿用 v3(`sit3a-d` 里选中的那个),接包时两态一起落。

## 「我的」选中态 v5（当前候选）

v4 的 3 份选中态里,用户选 **b 的感觉**（爪举到胸/肩高、掌心朝观者），但指出**举错了手**:
v4b 举的是猫的**右手**（画面上出现在左侧）。v5 沿用同样的姿态感觉,改为**猫的左手**举起。

**左右消歧要点**:猫正面朝向观者时,**猫的左手出现在画面右侧**。提示词里同时写死
「猫的左手」与「画面右半边的那条前腿」,并要求「不要画反」——单写"左手"模型有概率镜像画错。

三份只差掌心朝向/举高:

| 候选 | 姿态 |
|---|---|
| sit5a | 猫左手举到齐胸高,掌心正对观者,爪掌画大、四枚趾垫整齐 |
| sit5b | 猫左手齐胸,稍侧掌,主垫+四趾垫完整可见 |
| sit5c | 猫左手举到肩头,掌心朝前,肉垫醒目 |

- 生成:\`node compose-me-pose5.mjs && node generate.mjs --prompts prompts-me-pose5.txt --char char-ref.local.jpg\`
- 归一:\`python prepare-v18.py --only active-sit5 --force-matte\`
- 对照图:见 README 顶部表格（`sheet-me-pose4.py` 已改为输出 v5 对照）
- 未选中态沿用 v3;接包时两态一起落。

## 「我的」v6 五组完整方案（当前候选）

用户选定 v5 的 **5b** 作为选中态感觉后,要求「参考 5b 重新生五组」。v6 出**五组完整方案**,
每组 = **未选中 + 选中配对**（同一只猫两状态）——挑定一组即可整体接包,不必再单独选未选中。

五组只在体型/头身比/细节量上分:

| 组 | 体型 |
|---|---|
| g6a | A 标准头身比（最接近 5b） |
| g6b | B 头大更圆·身体矮胖 |
| g6c | C 身体略修长·前腿清晰 |
| g6d | D 圆润敦实·臀部饱满 |
| g6e | E 细节更少·造型概括 |

两态锁定:选中=猫的左手抬起(画面右侧)+粉色肉垫正对观者(即 5b);未选中=两前爪并拢踩地安静。
其余全部沿用 v3-v5:测测子角色毛色、正对端正、藏尾巴、雾蓝纯色底、无地面影。

- 生成:\`node compose-me-pose6.mjs && node generate.mjs --prompts prompts-me-pose6.txt --char char-ref.local.jpg\`
- 归一:\`python prepare-v18.py --only g6 --force-matte\`
- 对照图:\`python sheet-me-pose6.py\`（出五组图 + 实景底栏 + 真实尺寸三张）

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

- 第一轮 30 张（五组方向）× gpt-5.4-image-2：**$14.65**（约 19 分钟，3 并发）。
- 第二轮 10 张（猫 v1）：**$4.93**。
- 第三轮 8 张（猫 v2 白底，已废弃）：**$4.00**。
- 第四轮 8 张（猫 v3 纯色底）：**$4.00**。
- 第五轮 3 张（选中态抬手 v4·右手，被否）：**$1.50**。
- 第六轮 3 张（选中态 v5·左手，用户选定 5b）：**$1.51**。
- 第七轮 10 张（v6 五组完整方案，当前候选）：**$5.02**。
- 累计 **$35.61**，明细见 `generated/manifest.json`。
