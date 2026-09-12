#!/usr/bin/env node
/**
 * COS 资产发布：校验塔罗清单 → 调用 kit 版本化上传 → 写出本机构建地址。
 *
 * 用法:
 *   npm run assets           一键：校验 → 真传 → 写地址 → 重建小程序
 *   npm run assets:check     只检查 art/generated-art 是否齐 24 张塔罗图
 *   npm run assets:upload    dry-run 打印上传计划
 *   npm run assets:publish   真传并写入 .asset-base-url
 *
 * 密钥读取顺序（后面的不会覆盖前面的）：
 *   1. 真实环境变量（CI / 临时改指向）
 *   2. 本项目根 .env（已 gitignore，密钥归属本项目，推荐）
 *   3. kit 仓库根 .env（历史写法，兜底）
 * 需要的键：COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION（可选 COS_PUBLIC_BASE）。
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
const localEnvPath = path.join(root, '.env')
const kitEnvPath = path.join(kitRoot, '.env')
const uploadScript = path.join(kitRoot, 'cos', 'upload-cos.mjs')
// 真正上 COS 的只有 tarot/ 子树 + 生图 manifest；generated-art 里的 avatar 等实验产物不上传
const stagedDir = path.join(root, 'tmp-publish-stage')

const TAROT_MAJORS = [
  'the-fool',
  'the-magician',
  'high-priestess',
  'the-empress',
  'the-emperor',
  'the-hierophant',
  'the-lovers',
  'the-chariot',
  'strength',
  'the-hermit',
  'wheel-of-fortune',
  'justice',
  'the-hanged-man',
  'death',
  'temperance',
  'the-devil',
  'the-tower',
  'the-star',
  'the-moon',
  'the-sun',
  'judgement',
  'the-world',
]

// 两套皮肤：classic 原文件 + clay 皮肤（猫咪占卜屋，-clay 后缀同名文件）
export const TAROT_FILES = [
  'tarot/ui/sanctuary-background.jpg',
  'tarot/ui/card-back.jpg',
  ...TAROT_MAJORS.flatMap((name) => [`tarot/cards/${name}.jpg`, `tarot/cards/${name}-clay.jpg`]),
  'tarot/ui/sanctuary-background-clay.jpg',
  'tarot/ui/card-back-clay.jpg',
]

const args = new Set(process.argv.slice(2))
const checkOnly = args.has('--check')
const yes = args.has('--yes')
const alsoBuild = args.has('--build')

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

/**
 * 只把 tarot/ 子树（48 张）与生图 manifest.json 暂存到一个干净目录再上传，
 * 避免把 generated-art 里的 avatar 等实验产物（100MB+）一起推上 COS。
 * 暂存目录名匹配 .gitignore 的 tmp* 规则，不产生未跟踪文件。
 */
function stagePublishDir() {
  fs.rmSync(stagedDir, { recursive: true, force: true })
  fs.mkdirSync(stagedDir, { recursive: true })
  fs.cpSync(path.join(assetDir, 'tarot'), path.join(stagedDir, 'tarot'), { recursive: true })
  const manifest = path.join(assetDir, 'manifest.json')
  if (fs.existsSync(manifest)) fs.copyFileSync(manifest, path.join(stagedDir, 'manifest.json'))
}

function cleanupStage() {
  fs.rmSync(stagedDir, { recursive: true, force: true })
}

// 本项目 .env 优先于 kit .env；loadDotEnv 不覆盖已存在的键，故真实环境变量优先级最高
loadDotEnv(localEnvPath)
loadDotEnv(kitEnvPath)

if (!fs.existsSync(assetDir)) die(`资产目录不存在: ${assetDir}。先把塔罗图放到 art/generated-art/tarot/`)

const missing = missingTarot()
if (missing.length) {
  console.error(`[assets] 塔罗资源缺 ${missing.length}/${TAROT_FILES.length} 张，小程序会停在「资源加载失败」：`)
  for (const rel of missing) console.error(`  - art/generated-art/${rel}`)
  if (checkOnly || yes) die(`补齐 ${TAROT_FILES.length} 张后再发布`)
}

if (checkOnly) {
  console.log(`[assets] 塔罗 ${TAROT_FILES.length} 张齐全`)
  process.exit(0)
}

if (!fs.existsSync(uploadScript)) die(`找不到 kit 上传脚本: ${uploadScript}`)

if (yes) {
  const missingEnv = ['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_BUCKET', 'COS_REGION']
    .filter((name) => !process.env[name]?.trim())
  if (missingEnv.length) {
    die(`缺少 ${missingEnv.join('、')}。写到本项目根 .env（已 gitignore，推荐）或 kit 仓库根 .env，不要写进任何入库文件`)
  }
}

const prefix = readPrefix()
const version = gitShortSha()
const base = publicBase()
const assetBaseUrl = base ? `${base}/${prefix}/${version}` : ''

console.log(`[assets] 目录 ${assetDir}（仅上传 tarot/ + manifest.json）`)
console.log(`[assets] COS 路径 ${prefix}/${version}/`)
if (assetBaseUrl) console.log(`[assets] 构建地址 ${assetBaseUrl}`)
else console.log('[assets] 未设置 COS_PUBLIC_BASE，上传后请手动拼 TARO_ASSET_BASE_URL')

stagePublishDir()

const result = spawnSync(process.execPath, [
  uploadScript,
  '--dir', stagedDir,
  '--prefix', prefix,
  '--version', version,
  ...(yes ? ['--yes'] : []),
], { stdio: 'inherit', cwd: root, env: process.env })

cleanupStage()

if (result.status !== 0) die(`上传脚本退出码 ${result.status ?? 'null'}`)

if (yes && assetBaseUrl) {
  fs.writeFileSync(envOut, `${assetBaseUrl}\n`, 'utf8')
  console.log(`[assets] 已写入 ${envOut}`)
} else if (yes) {
  console.log(`[assets] 上传完成。把 TARO_ASSET_BASE_URL 设为 https://<你的域名>/${prefix}/${version} 后重建`)
}

if (yes && alsoBuild) {
  console.log('[assets] 开始重建小程序…')
  const build = spawnSync(process.execPath, [
    path.join(root, 'scripts', 'with-asset-env.mjs'),
    'npm', '--prefix', 'miniapp', 'run', 'build:weapp',
  ], { stdio: 'inherit', cwd: root, env: process.env })
  if (build.status !== 0) die(`小程序构建退出码 ${build.status ?? 'null'}`)
  console.log('[assets] 完成。微信开发者工具导入 miniapp 目录，清缓存后编译')
} else if (yes) {
  console.log('[assets] 下一步：npm run build:weapp   （会自动读取该地址）')
  console.log('[assets] 微信公众平台 → 开发管理 → 开发设置 → downloadFile 合法域名，加入 COS/CDN 的 HTTPS 域名')
} else {
  console.log('[assets] dry-run 完成。确认清单后执行 npm run assets')
}
