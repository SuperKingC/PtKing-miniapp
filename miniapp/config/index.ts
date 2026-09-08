import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type UserConfigExport } from '@tarojs/cli'

function readLocalAssetBaseUrl(): string {
  const fromEnv = process.env.TARO_ASSET_BASE_URL?.trim()
  if (fromEnv) return fromEnv
  const candidates = [
    path.resolve(process.cwd(), '.asset-base-url'),
    path.resolve(process.cwd(), '..', '.asset-base-url'),
    path.resolve(__dirname, '../../.asset-base-url'),
  ]
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue
    const url = fs.readFileSync(file, 'utf8').trim()
    if (url) return url
  }
  return 'https://placeholder.cos.ap-guangzhou.myqcloud.com/ptking-web/local-dev'
}

// 服务端 API 根地址：M0 骨架阶段默认本机占位；server 落地后用环境变量或改默认值指向正式域名
const apiBaseUrl = process.env.TARO_API_BASE_URL?.trim() || 'http://127.0.0.1:8787'
// 静态资产版本根目录（COS）：优先环境变量，其次仓库根 .asset-base-url，避免直接编 miniapp 时落到占位域名
const assetBaseUrl = readLocalAssetBaseUrl()
// 仅本地开发构建注入（如 http://127.0.0.1:8787，本机 http-server 模拟 COS）：
// 开发者工具模拟器访问该地址，真机与正式包仍走正式域名；正式构建不设置即完全禁用
const assetDevBaseUrl = process.env.TARO_ASSET_DEV_BASE_URL?.trim() || ''
// 激励视频广告位 ID（微信公众平台-流量主-广告位管理创建）。
// 报告解锁变现用：留空 = 报告页跳过广告直接展示（本地开发与未开通流量主时的安全降级）
const rewardedAdUnitId = process.env.TARO_AD_UNIT_ID?.trim() || ''

const config: UserConfigExport = defineConfig({
  projectName: 'ptking-miniapp',
  date: '2026-09-02',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: ['@tarojs/plugin-framework-react'],
  defineConstants: {
    TARO_API_BASE_URL: JSON.stringify(apiBaseUrl),
    TARO_ASSET_BASE_URL: JSON.stringify(assetBaseUrl),
    TARO_ASSET_DEV_BASE_URL: JSON.stringify(assetDevBaseUrl),
    TARO_AD_UNIT_ID: JSON.stringify(rewardedAdUnitId),
  },
  copy: {
    // 原生 tabBar 图标必须在 dist 内实体存在（app.json 引用相对路径）
    patterns: [{ from: 'src/assets/tabbar/', to: 'dist/assets/tabbar/' }],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
      },
      cssModules: {
        enable: false,
      },
    },
    webpackChain(chain) {
      chain.output.publicPath('/')
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
  },
})

export default config
