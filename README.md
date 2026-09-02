# PtKing 小程序

心理测试 + 塔罗微信小程序（独立于 Pet10 的新产品）。

## 结构

- `miniapp/` Taro 4.2.1 + React 18 微信小程序（与 Pet10 同版本，代码可平移）
- `docs/features/` 功能文档（随功能落地补齐）
- `scripts/` 资产生图/压缩/COS 上传管线（M2 前补齐）

## 构建与测试

```bash
npm --prefix miniapp install
npm --prefix miniapp run test          # vitest
npm --prefix miniapp run build:weapp   # 产物 miniapp/dist
```

构建期环境变量：

- `TARO_ASSET_BASE_URL`：正式 COS 资产根（M0 有占位默认值，接入 COS 后必填真实值）
- `TARO_ASSET_DEV_BASE_URL`：可选，本机 http-server 模拟 COS（仅开发者工具模拟器生效）
- `TARO_API_BASE_URL`：服务端 API 根（M0 默认本机 8787 占位）

## 里程碑

- M0 仓库脚手架：Taro 骨架 + 四 tab（测试/塔罗/记录/我的）+ 构建验证 ✅
- M1 测试引擎 + MBTI 迁移：详情/答题/免费报告页全通
- M2 内容首批 4~6 个测试（COS JSON）+ 记录页 + 我的
- M3 塔罗全流程从 Pet10 平移上线
- M4 分享卡片、（可选）支付
