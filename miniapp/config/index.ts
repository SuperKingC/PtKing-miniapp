import { defineConfig, type UserConfigExport } from '@tarojs/cli'

// 服务端 API 根地址：M0 骨架阶段默认本机占位；server 落地后用环境变量或改默认值指向正式域名
const apiBaseUrl = process.env.TARO_API_BASE_URL?.trim() || 'http://127.0.0.1:8787'
// 静态资产版本根目录（COS）：测试题目 JSON、报告文案与图片都从这里热更下发，子路径各功能自持。
// 未注入时用占位地址保证骨架可构建；接入正式 COS 后由构建环境注入真实值
const assetBaseUrl =
  process.env.TARO_ASSET_BASE_URL?.trim() ||
  'https://placeholder.cos.ap-guangzhou.myqcloud.com/ptking-web/local-dev'
// 仅本地开发构建注入（如 http://127.0.0.1:8787，本机 http-server 模拟 COS）：
// 开发者工具模拟器访问该地址，真机与正式包仍走正式域名；正式构建不设置即完全禁用
const assetDevBaseUrl = process.env.TARO_ASSET_DEV_BASE_URL?.trim() || ''

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
