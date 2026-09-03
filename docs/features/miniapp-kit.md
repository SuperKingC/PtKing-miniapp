# 功能：miniapp-kit 工具箱接入（美术资产流水线）

状态：已落地（doctor 体检全绿 + 各 CLI 入口验证通过；真实生图与 COS 上传待实际跑过）

## 定位

[miniapp-kit](https://github.com/SuperKingC/miniapp-kit) 是跨项目小程序工具箱，独立仓库在 `D:\Mine\miniapp-kit`（与本项目同级）。
接入形态是**零依赖直调**：根 `package.json` 的脚本按相对路径 `../miniapp-kit/...` 调 kit CLI，不复制、不改 kit、不装依赖；密钥全部存在 kit 仓库根 `.env`（已 gitignore），本项目仓库不落任何 key。

kit 侧模块现状：`art/`（生图流水线）、`matting/`（纯色底抠图）、`preview/`（本机静态服务）、`cos/`（SHA 版本化上传，默认 dry-run）、`anim/`（图生视频，PtKing 尚未接）、`theme/`（字体 token，PtKing 尚未接）。

## 命令（根 package.json）

| 命令 | 作用 |
|---|---|
| `npm run doctor:kit` | 环境体检（key/权重/python/ffmpeg），只报告不自动安装 |
| `npm run art` | 生图流水线：关键词优化 → 并发生图（默认 3 并发）→ TinyPNG 单次压缩 → 升文件名 → manifest 留痕 → 体积红线 |
| `npm run art:ui -- "界面描述"` | UI 设计稿模式：出 5 张不同排版方向的 2:3 设计稿供挑选（重设计界面先跑这个再写代码） |
| `npm run art:probe` | 透明底直出探测（实测四路全堵，透明素材走「纯色底+matting」） |
| `npm run art:matting -- <图片> <输出目录>` | 纯色底抠图，默认 `--method ben2`（BEN2 实测首选） |
| `npm run art:preview` | 本机静态服务模拟 COS（`http://127.0.0.1:8787/ptking-web/local-dev` → `art/generated-art/`） |
| `npm run art:upload -- [--prefix <COS基础URL>] [--yes]` | COS 版本化上传，默认 dry-run；`--yes` 才真传（需 `COS_SECRET_ID/KEY/BUCKET/REGION` 四个环境变量） |

## 文件布局

- `art.config.json`（根，**gitignore 不入库**，含中转地址；模板在 kit `art/art.config.example.json`）：风格锚定、API/模型列表、并发数、TinyPNG key 变量名与 180KB 上限、输出目录。
- `art/prompts.txt`（**入库**）：提示词清单，每行 `name|提示词`。
- `art/generated-art/`（gitignore）：生图产物 + `manifest.json` 留痕；`probe-transparent/` 子目录是透明底探测产物。
- `scripts/matting.mjs`：抠图包装器——matting 需要 cv2/torch 解释器，路径单点存于 kit `.env` 的 `PYTHON_MATTING`，包装器读取后拉起子进程（系统 python 缺依赖，不能直跑）。

## 模拟器本地预览链路

1. `npm run art:preview` 起本机服务（`art/generated-art/` 挂在 `/ptking-web/local-dev` 下）。
2. 另开终端带 dev 资产根重建：
   `TARO_ASSET_DEV_BASE_URL=http://127.0.0.1:8787/ptking-web/local-dev npm run dev:weapp`
3. `miniapp/src/services/assetBaseUrl.ts` 按平台守卫：仅开发者工具模拟器（platform=devtools）走本机地址，真机与正式包一律走正式 COS 根，重建不改指向。

## COS 上传

`npm run art:upload` dry-run 打印上传计划；真实路径规则 `<prefix>/<git短SHA>/<相对路径>` + immutable 缓存头，发版即全量新 URL。`--prefix` 需与 `art.config.json` 的 `output.cos` 口径一致（当前约定 `assets/ptking`）。COS 凭据尚未配置，上传链路待真实凭据验证。

## 约束

- 测试内容（题目/报告文案/图片）不进主包，一律 `art/generated-art` → COS 热更下发（`TARO_ASSET_BASE_URL`）。
- 压缩只在流水线内走 TinyPNG 每张一次，严禁本地预压/二次压缩/降色板换体积；超 180KB 流水线只在末尾提醒。
- 换同路径图片必须升文件名防缓存（流水线自动）；改图后微信开发者工具清缓存重编译。
- 模型优先 `openai/gpt-5.4-image-2`（config `api.models` 首位），约 $0.47/张 2K；gemini 系约 $0.07/张。
- kit 仓库只读：发现要改的功能回 kit 仓库改、发版，再回来同步。

## 验证记录

- `npm run doctor:kit`：全部就绪（Node/生图 key/TinyPNG key×3/art.config/kit 依赖/ffmpeg/matting python 环境/BEN2/SAM2 权重）。
- `npm run art -- --dry-run`：提示词优化与配置解析正常，不花钱。
- `npm run art:upload`：dry-run 正常列出产物计划。
- `npm run art:preview`：本机服务可达，manifest 可经 URL 取回。
- `npm run art:matting`（无参）：包装器正确拉起 PYTHON_MATTING 解释器并透传 usage。
- 未验区域：真实生图计费链路、`art:probe`、真实 COS 上传（等凭据）、BEN2 全流程经本包装器跑一遍。
