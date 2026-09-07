#!/usr/bin/env node
/**
 * COS 资产发布：校验塔罗清单 → 调用 kit 版本化上传 → 写出本机构建地址。
 *
 * 用法:
 *   npm run assets:check     只检查 art/generated-art 是否齐 24 张塔罗图
 *   npm run assets:upload    dry-run 打印上传计划
 *   npm run assets:publish   真传并写入 .asset-base-url
 *
 * 密钥只读 kit 仓库根 .env（COS_SECRET_ID/KEY/BUCKET/REGION，可选 COS_PUBLIC_BASE）。
 * 本项目不落任何 key。
 */
import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const kitRoot = process.env.MINIAPP_KIT_DIR
  ? path.resolve(process.env.MINIAPP_KIT_DIR)
  : path.resolve(root, '../miniapp-kit')
const assetDir = path.join(root, 'art', 'generated-art')
const configPath = path.join(root, 'art.config.json')
const envOut = path.join(root, '.asset-base-url')
const uploadScript = path.join(kitRoot, 'cos', 'upload-cos.mjs')

const TAROT_FILES = [
  'tarot/ui/sanctuary-background.jpg',
  'tarot/ui/card-back.jpg',
  'tarot/cards/the-fool.jpg',
  'tarot/cards/the-magician.jpg',
  'tarot/cards/high-priestess.jpg',
  'tarot/cards/the-empress.jpg',
  'tarot/cards/the-emperor.jpg',
  'tarot/cards/the-hierophant.jpg',
  'tarot/cards/the-lovers.jpg',
  'tarot/cards/the-chariot.jpg',
  'tarot/cards/strength.jpg',
  'tarot/cards/the-hermit.jpg',
  'tarot/cards/wheel-of-fortune.jpg',
  'tarot/cards/justice.jpg',
  'tarot/cards/the-hanged-man.jpg',
  'tarot/cards/death.jpg',
  'tarot/cards/temperance.jpg',
  'tarot/cards/the-devil.jpg',
  'tarot/cards/the-tower.jpg',
  'tarot/cards/the-star.jpg',
  'tarot/cards/the-moon.jpg',
  'tarot/cards/the-sun.jpg',
  'tarot/cards/judgement.jpg',
  'tarot/cards/the-world.jpg',
]

const args = new Set(process.argv.slice(2))
const checkOnly = args.has('--check')
const yes = args.has('--yes')

function die(msg) {
  console.error(`[assets] ${msg}`)
  process.exit(1)
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

function readPrefix() {
  if (!fs.existsSync(configPath)) {
    die(`缺少 art.config.json。从 kit 模板复制：${path.join(kitRoot, 'art', 'art.config.example.json')}`)
  }
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  const raw = String(cfg.output?.cos || 'assets/ptking').replace('{project}', 'ptking')
  return raw.replace(/^\/|\/$/g, '')
}

function gitShortSha() {
  return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim()
}

function publicBase() {
  return (process.env.COS_PUBLIC_BASE || '').replace(/\/$/, '')
}

function missingTarot() {
  return TAROT_FILES.filter((rel) => !fs.existsSync(path.join(assetDir, rel)))
}

loadDotEnv(path.join(kitRoot, '.env'))

if (!fs.existsSync(assetDir)) die(`资产目录不存在: ${assetDir}。先把塔罗图放到 art/generated-art/tarot/`)

const missing = missingTarot()
if (missing.length) {
  console.error(`[assets] 塔罗资源缺 ${missing.length}/24 张，小程序会停在「资源加载失败」：`)
  for (const rel of missing) console.error(`  - art/generated-art/${rel}`)
  if (checkOnly || yes) die('补齐 24 张后再发布')
}

if (checkOnly) {
  console.log('[assets] 塔罗 24 张齐全')
  process.exit(0)
}

if (!fs.existsSync(uploadScript)) die(`找不到 kit 上传脚本: ${uploadScript}`)

const prefix = readPrefix()
const version = gitShortSha()
const base = publicBase()
const assetBaseUrl = base ? `${base}/${prefix}/${version}` : ''

console.log(`[assets] 目录 ${assetDir}`)
console.log(`[assets] COS 路径 ${prefix}/${version}/`)
if (assetBaseUrl) console.log(`[assets] 构建地址 ${assetBaseUrl}`)
else console.log('[assets] 未设置 COS_PUBLIC_BASE，上传后请手动拼 TARO_ASSET_BASE_URL')

const result = spawnSync(process.execPath, [
  uploadScript,
  '--dir', assetDir,
  '--prefix', prefix,
  '--version', version,
  ...(yes ? ['--yes'] : []),
], { stdio: 'inherit', cwd: root, env: process.env })

if (result.status !== 0) die(`上传脚本退出码 ${result.status ?? 'null'}`)

if (yes && assetBaseUrl) {
  fs.writeFileSync(envOut, `${assetBaseUrl}\n`, 'utf8')
  console.log(`[assets] 已写入 ${envOut}`)
  console.log('[assets] 下一步：npm run build:weapp   （会自动读取该地址）')
  console.log('[assets] 微信公众平台 → 开发管理 → 开发设置 → downloadFile 合法域名，加入 COS/CDN 的 HTTPS 域名')
} else if (yes) {
  console.log(`[assets] 上传完成。把 TARO_ASSET_BASE_URL 设为 https://<你的域名>/${prefix}/${version} 后执行 npm run build:weapp`)
} else {
  console.log('[assets] dry-run 完成。确认清单后执行 npm run assets:publish')
}
