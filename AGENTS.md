# PtKing-miniapp AI 维护规则

## 改代码之前

1. 先读 `AGENTS.md` 与 `docs/features/` 下相关功能文档。
2. 确认当前 worktree、分支、基线提交与未提交改动。
3. 编辑前明确一句话目标与非目标清单。
4. 从最新 `main` 开工，不在旧工作区上续作。

## 架构边界

- UI 组件只渲染与处理交互，不承载复杂领域算法。
- domain 代码确定性、纯函数，不碰 HTTP、存储、React。
- services 独占网络、存储、平台 API 与外部集成。
- 测试内容（题目/报告文案/图片）不进主包，一律走 COS 资产根（`TARO_ASSET_BASE_URL`）热更下发。
- 不为局部方便加跨层 import。

## 变更协议

- 用最小改动达成目标。
- 行为变更前先补/改对应聚焦测试（vitest）。
- 小程序改动全部留在 `miniapp/` 内；每次改动后清缓存重编译，保证预览的是最新构建。
- 图片资产遵守：运行时图片先降分辨率再压质量；打进包内资产走 TinyPNG、禁 WebP、单图 ≤180KB、PNG8/JPEG。
- 打进主包的图（`miniapp/src/assets/`）可以覆盖同名：开发者工具清「全部缓存」后重编译即可；升文件名只是可选保险，不再强制。COS 热更图（塔罗等）同名覆盖，靠 `assets:hot` 的 `assetRev` 加 `?r=` 刷新，不必升名、不必发新版。
- WXSS 绝对定位写显式四边 + 显式宽高；内联尺寸写 rpx 不写 px。

## 视觉风格（reference-ui 高调奶油软陶）

2026-09-11 用户选定 `miniapp/art/ref-pages-v3/reference-ui.png`（三页参考稿）为全包插画锚点，原 ui-4 锚点（`art/generated-art/me-heal-preview-ui/ui-4.png`）退役。后续生图、改版、换图必须贴合，禁止退回扁平矢量色块、水彩勾线、彩铅排线。

- 造型：高调奶油软陶 claymorphism——哑光聚合软陶，表面干净光滑细腻，细纸纹微粒，毡面纤维感弱；圆润饱满，无硬描边。
- 光影：高调影棚光，环境光足，阴影浅而弥散，几乎无重落影；有柔和体积但不厚重，禁止浓毡纤维与暗调重影。
- 色板（整体提亮一档、低对比柔和）：奶油白、燕麦 `#f7f4ee`、米色胶囊 `#e9dfd0`、水感雾蓝（亮）、奶杏陶土（淡）、浅金褐。
- 画面结构：扁平 UI 面板（白/米白卡片 + 细软投影 + crisp 深棕扁平字）上贴软陶 3D 小物件（插画/图标/底栏物件），不是整页微缩模型。
- 「我的」品牌栏：构图已定为 2026-09 重设计稿 `art/generated-art/me-redesign-ui/ui-3_v2.png`（雾蓝圆角面板：左行「测测子」大字+「来测测你的另一面」副题，中坐姿猫捧书，右散月亮/沙漏/云）；包内资产为几何圆角 alpha 蒙版透明 PNG（`me-banner-panel-v4.png`，见 `miniapp/art/me-redesign/prepare-banner-geom.py`）；「测测子」「来测测你的另一面」必须画进图，禁止 CSS 叠字。
- 「我的」列表/偏好图标：垃圾桶、盾牌锁、分享、对话气泡、月牙星、铃铛，走 BEN2 软 alpha 抠图（`prepare-ben2-me.py`），禁止色键硬阈值二值抠图（会切掉软边）。
- 底栏：米色颗粒胶囊；四枚图标固定为探头猫+测验纸、扇形三张牌（两侧雾蓝、中间陶土菱纹）、爪印厚本、坐姿奶油猫。未选中 / 选中是同一物件两种状态。
- 列表图标：垃圾桶、盾牌锁、纸飞机、对话气泡、月牙星、震动手机，与底栏同一套软陶。白底生图后泛洪抠成透明 PNG，禁止从整页稿裁切带卡底。卡片质感用 CSS 宽软投影，不要画进图标。
- item 外边缘厚度标准（2026-09-11 用户验收定稿，参考稿影带 α 剖面）：一律用全局 `--shadow-card` 实色接触带三层法——无模糊实色接触带（`0 6rpx 0`，锁出核心厚度）+ 紧贴软影 + 远端余晖；box-shadow 高斯层做不出「肥核心」，禁止只写纯软影或手写新侧壁参数（新页面直接 `box-shadow: var(--shadow-card)`，卡片自带 inset 高光时在其后拼接 `var(--shadow-card)`）。胶囊条/激活 chip 等小物件同剖面，接触带按比例缩（2-4rpx）。暗色主题值同步在 app.scss 四处定义（page / prefers-dark / theme-light / theme-dark）。
- 风格锚定同时写在 `art.config.json` 的 `style` 与 `art/prompts.txt` 头注释；细则见 `docs/features/miniapp-kit.md`。

## 美术资产与 miniapp-kit

- 美术资产一律走 kit 流水线（`npm run art` / `art:ui`），不手工改图、不改 `D:\Mine\miniapp-kit`（kit 仓库只读，要改回 kit 改）。
- `art.config.json` 含中转地址，gitignore 不入库；`art/prompts.txt` 入库；产物 `art/generated-art/` 不入库，走 COS 热更下发。
- 密钥只存 kit 仓库根 `.env`，本项目仓库不落任何 key。
- 重设计界面先用 `npm run art:ui -- "界面描述"` 出 5 张设计稿给用户挑，再写代码。
- 新环境先跑 `npm run doctor:kit` 体检，缺失项征得用户同意再装。
- 模拟器本地预览资产：`npm run art:preview` + 构建时注入 `TARO_ASSET_DEV_BASE_URL`（细则见 `docs/features/miniapp-kit.md`）。

## 验证

- 开发期用最快相关检查（vitest 单文件）。
- UI/交互改动必须在微信开发者工具用 freshly built `miniapp/dist` 预览。
- 不报告命令、结果、未验区域与预览入口就不算完成。
- 合并或部署前跑 `npm run test`（后续引入 verify:full）。
- 视觉改动需用户验收后才能合 `main` 或部署。

## 任务提交纪律

- 任务达标且通过最快相关检查后立即提交（中文提交信息）。
- 只 stage 本任务明确触碰的文件路径；禁用 `git add -A` / `git add .`。
- 工作区中无关的未提交改动不回退、不收编、不混入，在报告里列出。

## Git 与部署

- 提交信息用中文。
- 不提交密钥、`.env.production`、本地进程状态。
- `main` 是唯一稳定基线。
- 部署用经批准的 GitHub workflow 与部署脚本（落地后补文档）。
