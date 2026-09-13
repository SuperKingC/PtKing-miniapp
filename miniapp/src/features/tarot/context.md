# 塔罗动效偏好工作记录

- 2026-09-13 15:05：clay 牌桌三项（用户：按钮下文字看不清 / 牌再下一点小一点 / 蜡烛火焰重做要真实且动态）。
  ①**「跳过…」文字看不清**：`.miniapp-tarot__text-action` 用 `--tarot-accent-strong(#c97a4a)` 橙字直接压在米色桌面上，色相几乎同色 → 糊成一片。实机取证对比度仅 **2.09:1**（远低于 WCAG AA 4.5）。clay 里换最深的深棕实字 `#5d3f2c` + 半粗 + 浅奶油描边光晕（`0 1rpx 0 rgba(255,253,246,.75)` + `0 0 12rpx`）把笔画从桌面上托起，实测 **6.19:1**。classic 一字未动（仍是 accent 淡紫）。
  ②**牌再下一点、小一点**：洗牌顶层牌 `top 108→148rpx`、`196×310→176×278rpx`（牌中心 263→287rpx），环/符文/波纹圆心 `288→312rpx`、软晕 `top 88→132rpx`、各层直径同比例缩（400/374/348/270/78 → 360/337/313/243/70）。切牌是洗牌下一幕，必须同一套尺寸位置，否则一切牌牌就"变大变高"——整叠 `230×356→179×278`、牌面 `214×326→167×254`、起牌侧移 `150,-84 → 117,-66rpx`，`cut-pile`/`cut-sheet`/`cut-face`、half(±90rpx/87rpx/91rpx)、符文圆/灵气圈(top 40%/55%) 全部跟牌走。两幕洗牌↔切牌尺寸一致（Chromium 同 harness 实测牌面 349→313px、整叠高 405→367px，均等比 ✓）。
  ③**蜡烛火焰重做**：上一版是「一线 S 形」（两段伪元素细带），用户要更真实。重做为**一朵尖顶肥底的水滴形真火**：`clip-path: polygon(50% 0%, 70% 30%, 86% 56%, 90% 74%, 78% 90%, 50% 100%, …)` 切出真火轮廓（描边与 border-radius 都做不出尖顶），内填贴底径向渐变（蓝白焰根/亮黄焰心/橙焰缘），`filter: blur(.0021*cover宽)` 让边缘被光晕吃掉不显硬剪纸。**关键坑**：焰尖绝不能再叠第二团——首版用两层渐变叠（下宽焰身 + 上窄渐隐焰尖）在实机渲染出**中间的糖葫芦腰**（两团各自渐隐留了一道掐腰）。改为整朵火只有一个形体。另加暖白内芯（偏下，真实蜡焰最亮点在焰根上方）+ 焰根蓝焰（`rgba(122,176,255)`）+ 蜡面溢光 + 外柔晕；动效 5 条不同频率叠加（摇摆 3.6s 不规则摆 / 焰身形状呼吸 1.9s / 内芯快闪 1.15s / 蓝焰 2.4s / 光晕 2.3s）才不机械。`motion-reduced` 由既有 mixin 统一压掉。
  ④**锚点勘误（重要）**：烛芯真实中轴是 **x 64.7%**、蜡面 **y 45.5%**（图上 768 宽时 wick x=495..498 中心 496.5、芯尖 y≈605、芯根 y≈618）。旧注释的 64.8%/45.6% 接近，但一度误测到 0.623（扫窗左上角吃到猫爪阴影）。**换背景图必须重量这组坐标并同步 SCSS + 契约测试。**
  ⑤**层级调整**：火焰层从「背景图之后、纱罩之前」改挂到**纱罩之后**（`MiniappTarotFlow.tsx` 里 `__veil` 提前），火苗读作画面里的光源、不再被纱罩压暗一层；契约测试加 `indexOf('__veil') < indexOf('__flame-scene')` 断言。
  ⑥**验证**：契约测试 `MiniappTarotFlow.styles.test.ts` 改/增四条（clay 牌堆缩小下移 + 切牌同套几何 + 跳过文字改深棕 + 水滴焰 clip-path/单一形体/蓝焰/双层挂载），聚焦 22 项、全量 **483** 全过。①Chromium（`art/verify-shots/render-clay-flame.cjs`，真实 dist wxss 按 750rpx=375px 换算）出洗牌/切牌 + classic 对照三图：牌堆等比缩小下移、跳过文字深棕清晰、火焰水滴形；classic 星夜几何与淡紫跳过文字原样未动。②**微信开发者工具实机**（`wechatide.cmd` 路线：`open_project_window` → `automation_navigate --action reLaunch` → `automation_element_action --selector … --action tap` → `simulator_screenshot`），本机 8787 静态服务模拟 COS 重编译后走到洗牌幕截图：火苗正坐在烛芯上、牌堆明显更小更靠下、跳过文字深棕可读。**正式 COS 资产未变**（本次纯前端 CSS，不涉及资产上传）；未做真机预览，等用户验收后再合。
  ⑦**工具提示**：`wechatide` 必须在非沙箱 shell 跑；`automation_element_action` 的 `--action` 支持 `tap/longpress/trigger/input/touchstart/touchmove/touchend` 等，`--wait-for-selector` 比固定 `--wait` 更稳。dist 若用 `TARO_ASSET_BASE_URL` 指本机服务，验完记得用正式 `.asset-base-url` 重编译，别把 localhost 留在预览构建里。

- 2026-09-13 14:40：clay 气泡语气改成神秘玄幻的占卜师口吻（用户：测测子的口吻需要神秘玄幻，像专业的占卜师一样）。
  ①**只改文案不动结构**：气泡的单枚几何（单节点 + 完整圆角 + 尾巴朝下）与「状态并进同句、clay 不渲染 hint」的机制都不变，只重写 `tarotSkinCopy.ts` 里 CLAY 的句子。
  ②**语气准则**：去掉「长按/点击/点一下/逐张点开」这类操作指令与「啦/咯」口语尾字，换成行家口吻——「凭直觉落下一刀，剩下的交给我与牌」「按住牌堆，让心里的话慢慢渗进牌里」「牌面泛起 40% 的光，松手歇一歇再按住」「已为你切过 2 次，想再落一刀也无妨」「让直觉带你挑出 N 张牌，递到我掌心」「牌已就位，让我为你揭开它们」「翻开每一张，让我听牌面低语」「牌已尽数翻开，答案就在其中」。实时进度/次数/张数仍并进同句，第一人称自称不变（过审要求称「测测子」体系、禁「占卜/算命/改运」）。
  ③**行长控制**：首版有几句在 560rpx 气泡里折成两行（如「牌堆已被你切过 2 次…」「不必多想，让直觉…」），逐句缩到单行（去冗余前缀、去掉「不必多想」），渲染核对三句主文案均为一行。
  ④**验证**：`tarotSkinCopy.test.ts` 增两条守卫——「clay 语气不出现操作指令词与口语尾字(啦/咯)、且含牌与玄意意象(直觉/掌心/低语/光/答案/杂音)」与「禁用词与猫咪泛称」；聚焦 78、全量 **482** 全过。仍按 headless Chrome 渲染 dist 真实编译产物逐阶段核对气泡（单块圆角 + 居中尾巴，文案一行放得下）；实机截图待用户验收。

- 2026-09-13 09:35：clay 牌背重出修「没有铺满」（用户：塔罗牌感觉没铺满，怀疑原图切图有问题、需重切）。
  ①**根因不在切图，在生图构图**：旧 `card-back-clay.jpg`（768×1376，2:3）把牌画成画面正中一张小牌，牌本体只占画面中央、四周留奶油底色，牌外沿比例 ~0.55；而牌位实框 196×310rpx = 0.632。`mode="aspectFill"` 会按框比例裁切，牌比例比框窄 → 左右两侧被切、上下露出底色。量测：旧图按 196×310 aspectFill 后牌面只覆盖 **66.5%**，左侧一条 **9.5%** 奶油带（右侧仅 3.4%，明显不均，这正是「没铺满」的观感）。纯重切也救不了：要切掉奶油带就得连牌自己的奶油白边框一起切掉。
  ②**修法=重出满幅出血版**：以旧牌背为 `--ref`（锁色板/菱格/八角星徽章），只改构图要求「牌外沿圆角紧贴画面四边、画面里只有这张牌」，2:3 出三张候选（`art/prompts-tarot-cardback-v2r.txt`）；另先出一版无参考图的 4 张（`-v2.txt`，色板偏浓，弃用）。按 196×310 实框逐张 aspectFill 量测选 **v2r3**：覆盖 **77.6%**、四边留白 2.4%~3.4%（均匀）、徽章居中偏差 <6%、菱格密度最贴近旧图。落位脚本 `miniapp/art/tarot-cardback/prepare-cardback.py`（768 宽 q90 → 166KB，≤180KB 红线），覆盖 `art/generated-art/tarot/ui/card-back-clay.jpg`（768×1152）。
  ③**验证（本机 8787 静态服务模拟 COS）**：清缓存重建 dist（注入 `TARO_ASSET_DEV_BASE_URL=http://127.0.0.1:8787/ptking-web/cardback-v2`，换路径根防磁盘缓存命中旧图）→ **微信开发者工具实机**走到洗牌阶段截图，牌背铺满方框、徽章居中，与旧图对照明显。聚焦 76 项、全量 **480** 全过。
  ④**自动化路径更新（重要，推翻上一条「automator 连不上」的结论）**：本机这版微信开发者工具（2.02.2608212 Nightly）`cli.bat auto` 的自动化端点确实起不来（`--auto-port` 被忽略、9420/32123 只回 404/403），但工具自带 **`wechatide` CLI** 可用：`wechatide -c <client> check_wechatide_status`（loginExpired:false）→ `open_project_window` → `simulator_screenshot --path` / `automation_navigate --action reLaunch --url` / `automation_element_action --selector .. --action tap|input --value` / `automation_page_action --action querySelectorAll`。以后实机取证优先走这条，不要再跟 `miniprogram-automator` 的 ws 端口死磕。注意 `wechatide` 必须在非沙箱 shell 运行。
  ⑤**未做**：正式 COS 上传（`npm run assets`）与真机预览——按 AGENTS.md「视觉改动需用户验收后才能合 main 或部署」，本次只做到包内/本机服务验证，等用户验收后再发布资产版本根。

- 2026-09-13 09:30：clay 气泡「两半拼贴」修正为单枚气泡 + 文案改成测测子口吻（用户：气泡割裂；气泡里要是测测子说的话，不是提示语）。
  ①**症状**：上一版把「指引标题（上半句）」和「底部状态行（下半句）」用两个节点负 margin 贴成一枚气泡，实际渲染出两道独立的圆角矩形、中间一道缝，看着像两个气泡叠在一起（截图量测：上块 x83..313、下块 x74..322，宽度与圆角都各算各的）。
  ②**气泡改法**：clay 只保留 `.miniapp-tarot__title` 这一个节点当气泡——`width:560rpx` + 完整 `border-radius:26rpx` + 自重投影，`::after` 尾巴挂在标题下沿朝下指猫；classic 的 `.miniapp-tarot__hint` 状态行在 clay `display:none`（其内容已并进标题那句），删掉 `order:-2/-1` 与 `margin:-26rpx` 的拼贴 hack。翻牌阶段原本靠单独补圆角，现在四个阶段同一套规则。
  ③**文案改法**：clay 的状态不再另起一行，而是**并进标题同一句**——`tarotSkinCopy.ts` 把 `shuffleTitle/cutTitle/fanTitle` 从纯字符串改成吃实时入参（洗牌进度 / 已切次数 / 已选张数），句子用第一人称邀请（「按住牌堆别松手，我帮你把牌洗得香香的」「你切了 2 次啦，想再来一下我也等你」「挑好啦，让我帮你翻开吧」）；`shuffleHint/cutHint/fanHint` 在 clay 返回空串（不再渲染）。`MiniappTarotShuffleStage/CutStage/FanStage` 三处调用点同步传参。classic 文案与结构一字未动（标题仍不吃入参、状态行仍在底部）。
  ④**验证**：`tarotSkinCopy.test.ts` 覆盖「状态并进同句 + 第一人称 + 不再有操作提示词（点击/逐张点开）+ clay hint 为空」；`MiniappTarotFlow.styles.test.ts` 改断「单枚气泡 width560/完整圆角/尾巴 -11rpx/hint display:none/无 order:-2」；聚焦 76 项、全量 **480** 全过。
  ⑤**自动化坑（沿用上一条结论）**：微信开发者工具 automator 仍连不上（IDE auto 端口被自身 HTTP 服务占用、`--auto-port` 被本版 CLI 忽略，自动化端点起不来），改按 AGENTS.md 既有的 headless Chrome 路子：新增 `art/verify-shots/render-bubble.cjs`——把 dist 的 **真实编译产物** `app.wxss` + `pages/tarot/index.wxss` 按 750rpx=375px 换算（1rpx=0.5px）后在 Chromium 渲染，逐阶段出图（洗牌 0/40%、切牌 0/2 次、选牌 0/1、翻牌全部）核对：气泡是一整块圆角 + 居中尾巴，接缝消失；classic 对照图仍是裸标题 + 底部状态行（未受影响）。实机截图待用户验收。

- 2026-09-13 08:30：clay 牌桌背景重出（换玻璃星云水晶球 + 长桌）+ 蜡烛火焰改 CSS「一线 S 形」。
  ①**需求**：测测子塔罗背景重出十种候选，水晶球要好看（不要原来的纯白素球）、背景蜡烛不画火焰（火焰留给前端特效）；用户看对照图后选定「通透玻璃球+球内旋涡星云、蜡烛未点燃、长桌」那版。
  ②**出图**：新增 `art/prompts-tarot-bg-options.txt`（10 条统一构图变体）→ 对照图脚本 `miniapp/art/ref-pages-v3/build-tarot-bg-contact-sheet.py`；用户选定后二次迭代——首版 opt1 是 2:3 宽板桌，用户指出「桌子要像之前一样长长的」，改用 `art/prompts-tarot-bg-long.txt` 并以**旧背景为 --ref** 重出（旧版是细长长桌、远端窄约 0.5 画宽落在画高 0.41、向观者外扩到满幅），long3 几何最贴近（远端 0.424 / 满幅 0.521，旧版 0.416 / 0.501）。
  ③**落位**：`miniapp/art/ref-pages-v3/install-tarot-bg-choice.py` 把 long3 等比缩到 768×1365（q88，78KB）→ `art/generated-art/tarot/ui/sanctuary-background-clay.jpg`（gitignore，走 COS 下发）。**只等比缩放不裁切**：火焰叠加依赖「烛芯在图上的比例坐标」，裁切会改比例导致火焰错位。
  ④**火焰 CSS**：`MiniappTarotFlow.tsx` 在 clay 皮肤挂 `.miniapp-tarot__flame-scene` 覆盖层（`skin === 'clay'` 才挂，classic 星夜不受影响），内含 glow/pool/body/core 四层。覆盖层宽 `max(100vw, 56.26vh)`（图比例 0.5626，复刻 aspectFill 的 cover 宽），火焰锚在图上量得的烛芯中轴 `left:64.8% / top:45.6%`。body 用两个伪元素各画一段反向微弯细带（`translateX(-50%) rotate(9deg)` 下段 + `left:68% rotate(-13deg)` 上段）叠成**一线 S 形**，配 `flame-sway/flow/flow-low/flow-high/flicker/glow/pool` 动效；motion-reduced 由既有 mixin 统一压掉。
  ⑤**坑**：中转站 `/models` 目录已无出图条目、`openai/gpt-5.4-image-2` 直连超时，但实测仍可出图（本轮 10+3+3 张全由它出）；本地 `art.config.json`（gitignore）已把风格锚点从旧「奶油扁平」更新为「高调奶油软陶」，并注明模型现状。
  ⑥**验证**：`MiniappTarotFlow.styles.test.ts` 增契约用例（classic 不挂火焰层 / 覆盖层 56.26vh / 锚点 64.8%·45.6% / S 两段伪元素 + 流动 keyframe），全量 480 测试过。因火焰是纯 CSS，另用 headless Chrome 按同款 CSS + `object-fit:cover` 复刻渲染逐帧核对：渲染图里烛芯列 x=265 与火焰锚点 265.3 重合、四相位 S 形流动正常。**微信开发者工具 automator 本轮未能连上（IDE auto 端口被自身 HTTP 服务占用、自动化端点起不来），实机截图待用户验收。**
  ⑦**维护提醒**：火焰坐标是绑在 `sanctuary-background-clay.jpg` 这张图上的——以后换背景图必须重量烛芯比例坐标并同步改 SCSS 与契约测试。

- 2026-09-13 07:55：clay 洗牌牌堆缩小下移 + 顶部去进度 + 测测子头顶对话气泡（用户：牌堆大小不对且挡住猫；去掉猫头上的进度；把下面气泡当成测测子的话放到猫头上）。
  ①**牌堆**：classic 的牌堆几何是对准背景金环中心的；clay 背景是浅色桌面、猫前爪搭在桌沿，同一套几何会顶到猫爪。在 `.skin-clay` 里把顶层牌 `top:18rpx→108rpx`、`226×356→196×310rpx`，环/符文/波纹圆心 `218rpx→288rpx`，软晕层(只有 translateX，top 是圆上沿)`top:-12rpx→88rpx`，各层直径同比例缩一档。
  ②**去掉顶部进度**：`.miniapp-tarot__progress`(几枚短横)与 `.miniapp-tarot__shuffle-bar` 在 clay 都 `display:none`——前者正好压在猫头与云的天际线上，后者是同一区域第二行进度。
  ③**气泡上移**：仪式四阶段(洗牌/切牌/选牌/翻牌)原来的做法是「标题裸在猫头顶 + 状态 hint 甩在屏幕底部」；改成合成一枚朝向猫头的对话气泡：标题(指引上半句)与 hint(状态下半句)用 `order:-2/-1` 提到牌堆之前，hint 用 `margin-top:-26rpx` 抵消 stage gap 后与标题贴成整块（上圆角在下圆角，只由下半投影），`::after` 尾巴朝下指向猫头；翻牌阶段没有 hint，标题独立成泡并补回下圆角。状态文案(百分比/已切次数/已选张数)原样保留。
  ④**验证方法坑**：`getTarotSkin` 有会话级缓存，直接 `wx.setStorageSync('ptking_skin')` 再 reLaunch **不会**让已挂载的 Flow 换肤，会误判「样式没生效」；必须点首页「牌桌」选择器走 `setTarotSkin`。另外 automator 的 auto-port 被 IDE HTTP 端口占用时会顺延（本次 9420 被占用→automator 落在 9421），且 `cli auto --port <port>` 才是让 IDE HTTP server 固定端口的正确写法。
  ⑤契约测试 `MiniappTarotFlow.styles.test.ts` 新增两条(clay 气泡/去进度、clay 牌堆几何)；`npx vitest run src/features/tarot` 23→ 全过、全量 **480** 过；清缓存重建 + automator 实机四图(洗牌/切牌/选牌/翻牌) + clay/classic 左右对照验收：clay 牌堆落在猫爪之下、气泡贴猫头、classic 几何与进度条原样未动。

- 2026-09-12 19:05：塔罗 48 张资产传 COS（用户：之前配过 COS，补密钥后传最新资源）。
  ①**发现**：桶 `ptking-assets-1300973162`（`ap-guangzhou`）真实存在且仍公开可读，历史上有两个版本目录 `06b0a05`(classic 24 张) / `c6b24c4`(48 张)，但**都是 09-11 之前的旧图**——本地重出/重压过的 clay 资产没上传（如 `sanctuary-background-clay.jpg` 线上 48KB vs 本地 68KB）。
  ②**根因「换电脑密钥就丢」**：原脚本只读 `miniapp-kit/.env`，而 kit 是公开 GitHub 仓库、`.env` 被 gitignore 故不随 git 同步；SecretKey 又只在创建时显示一次，无法找回。
  ③**脚本改造** `scripts/publish-assets.mjs`：密钥读取改为 环境变量 → 本项目根 `.env` → kit `.env` 三级（用户选本项目 `.env` 方案）；新增 `stagePublishDir()` 只暂存 `tarot/` + `manifest.json` 再上传——原逻辑递归传整个 `generated-art`，会把 114MB 的 avatar 实验图一起推上 COS（历史版本目录里本就没有这些）。
  ④**上传**：`npm run assets` → `assets/ptking/e8eb001/` 49 个文件（48 张塔罗 + manifest）7MB；`.asset-base-url` 已写正式域名，dist 注入 `https://ptking-assets-1300973162.cos.ap-guangzhou.myqcloud.com/assets/ptking/e8eb001`；线上 48/48 HTTP 200，关键文件 md5 与本地一致。
  ⑤**依赖坑**：`cos-nodejs-sdk-v5` 是 kit 声明的可选依赖但未安装；在 kit 侧 `npm install --include=optional`（node_modules 被 gitignore），装后还原 kit 被动改到的 `package-lock.json`（kit 只读）。
  ⑥文档 `docs/features/cos-assets.md` 更新「密钥放哪里（换电脑必读）」+ 真实桶名。全量 467 测试过。

- 2026-09-12 18:15：牌桌预览改包内真图 + 塔罗资源落盘缓存（用户：牌桌要用两套皮肤背景图，之前是好的；且下载过的资源要缓存）。
  ①**牌桌缩略图**：旧版 `skinThumbSrc` 铺远程 2:3 竖幅背景靠 `isUsableTarotAssetUrl` 判可达，未配资产根时退纯 CSS 星/月牙卡 → 用户看不到真场景。改为**从两套皮肤背景各裁一张横版小图打进包内**：`art/ref-pages-v3/compress-tarot-skin-thumbs.py` 产出 `tarot-skin-classic-v1.jpg`（490×330，33KB，对准月门）/`tarot-skin-clay-v1.jpg`（490×330，13KB，对准测测子与桌面），`index.tsx` 直接 import 本地图，删除 `isUsableTarotAssetUrl` 依赖与 `.tarot-home__skin-thumb-fallback*` 死样式；`index.scss` 缩略图去负 margin 改满铺。
  ②**资源缓存**：旧版 `preloadTarotResources` 的 `downloadFile` 临时文件**用完即弃**，每次进入重下 24 张（clay 约 2MB / classic 约 5MB）。新增 `tarotAssetCache.ts`：成功后 `saveFile` 落盘 + `ptking_tarot_asset_cache` 存 URL→本地路径映射（按资产版本根 base 分段，换版即清旧文件）；`preloadTarotResources` 命中缓存直接跳过下载，渲染侧全部改走 `resolveTarotAssetUrl()`（Flow 背景 + Card 牌背/牌面 + Cut/Shuffle/Fan + ReadingBody）。
  ③`wxGlobal.ts` 补 `getFileSystemManager`（saveFile/accessSync/unlinkSync）与 `WxFileSystemModule`；node/vitest 无 wx 时静默退回远程 URL。
  ④验证：`tarotAssetCache.test.ts`（7）+ `tarotAssets.test.ts`（11，含「二次进入 0 次下载」）新增，全量 457 过；本机 8788 带日志静态服务实测——首次进入 24 条 GET，退出再进两次均 **0 条塔罗资源请求**，牌桌两格显示真场景图。注意：真机需 `saveFile` 配额（每皮肤 ≤10MB，classic 5MB 接近上限）；正式包仍要 COS 上传 + `.asset-base-url` 注入域名。

- 2026-09-12 16:00：牌桌缩略图错图 + classic 星夜动画去月亮星星 + clay 资产重出。
  ①**用户可见症状「牌桌用的图片不对、点进塔罗资源加载失败」同一根因**：`art/generated-art/` gitignore，48 张塔罗图在盘上丢失（classic 24 张覆盖前被删，clay 24 张从未落盘），构建地址又只有占位域名 → 流程预加载 24 张全 404 停在「资源加载失败」；牌桌两格缩略图因 `skinThumbSrc` 不可达时退同一张包内 `tarot-panel-v6.jpg`（3:2 入口 hero，带「塔罗时光」烘焙标题），被 220rpx 窗口硬裁后两块都是 clay 场景+标题，判为错图。
  ②修复：classic 24 张从 `D:\Pet10\public\tarot` 回拷；clay 24 张用 kit `art/gen.mjs` 按 `art/prompts-tarot-clay.txt`+`-batch.txt` 24 条提示词重出（gemini-3.1-flash-image-preview 2:3，chariot/devil/high-priestess 三张首出带烘焙英文标题与色卡，带强禁字提示词重出干净），按 2:3 归一到 `sanctuary-background-clay.jpg`/`card-back-clay.jpg`/`*-clay.jpg`，逐张 q88 压到 ≤180KB。
  ③牌桌缩略图改 `string | null`：可达走该皮肤真场景（两套各自 2:3 竖幅），不可达走纯 CSS 肤色卡（classic 暗底月牙、clay 奶底星），**不再退同一张包内 hero**。
  ④classic 星夜帘幕删掉月亮/流星/星座连线三件套（用户：星夜牌桌动画不要月亮和星星），只留中缝暖光+halo 呼吸；`tarot-curtain__star` 星点改只挂 `skin === 'clay'`。契约测试同步（index.test.ts 断 `not.toContain` 旧节点名 + fallback 类名）。
  ⑤本地验证路径：`npm run art:preview`（本机 8787 静态服务模拟 COS）+ `TARO_ASSET_DEV_BASE_URL=http://127.0.0.1:8787/ptking-web/local-dev` 重建；真机/正式包仍需把 48 张传 COS 后 `.asset-base-url` 注入正式域名，本机无 COS 凭据未上传。

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
