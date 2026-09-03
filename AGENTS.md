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
- 换同路径图片必须升文件名防缓存。
- WXSS 绝对定位写显式四边 + 显式宽高；内联尺寸写 rpx 不写 px。

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
