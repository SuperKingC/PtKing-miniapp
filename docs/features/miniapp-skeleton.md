# 功能：小程序骨架（M0）

状态：已落地（待用户验收预览）

## 目标

建立独立仓库 `PtKing-miniapp` 的 Taro 工程骨架：原生四 tab（测试/塔罗/记录/我的），
技术栈与 Pet10 对齐（Taro 4.2.1 + React 18 + TypeScript + vitest），后续里程碑直接在此基线上叠加。

## 已实现

- 原生 tabBar 四页：`pages/test`（测试中心版式预览）、`pages/tarot`（圣殿占位）、
  `pages/records`（空态）、`pages/me`（入口列表静态）。
- 工程配置对齐 Pet10：`config/index.ts`（pxtransform/CSS 变量约定/webpack5）、
  babel/tsconfig、`project.config.json`（appid 暂为 touristappid 占位）。
- 资产根地址服务 `services/assetBaseUrl.ts`（devtools 本地模拟 / 真机正式域名双轨，纯函数可测）。
- tabBar 图标：`tools/make-tabbar-icons.cjs` 用 sharp 生成 81×81 线性 PNG（8 枚，灰/紫两态），
  `config/index.ts` copy 进 dist（原生 tabBar 图标必须实体存在）。
- 契约测试 `src/config/appConfig.test.ts`：锁定四页声明/tabBar 结构/图标文件存在/copy 规则。

## 设计约定

- 品牌色板在 `app.scss` CSS 变量：紫 `#6c5ce7` 主、暖橙 `#f39c6d` 点缀（塔罗）。
- 测试内容（题目/报告文案/封面图）一律不进主包，走 COS `{根}/tests/...` 热更（M2 落地）。
- 塔罗资产沿用 Pet10 COS `{根}/tarot/...` 前缀约定（M3 平移时接通）。

## 验证

- `npm --prefix miniapp run test`：vitest 全绿。
- `TARO_ASSET_BASE_URL=<占位> npm --prefix miniapp run build:weapp`：dist 产出，app.json 含 tabBar。
- 开发者工具导入 `miniapp/` 预览四 tab 切换。
