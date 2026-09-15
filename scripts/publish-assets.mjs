#!/usr/bin/env node
/**
 * COS 资产发布：校验塔罗清单 → 调用 kit 版本化上传 → 写出本机构建地址。
 *
 * 用法:
 *   npm run assets           开新频道（git SHA 新目录）→ 写指针 → 重建；给下一个小程序版本用
 *   npm run assets:hot       覆盖 .asset-base-url 指向的现有目录，不改指针、不重建；给已上架包热更
 *   npm run assets -- --channel      release/* 分支取末尾版本号（如 release/1.0.0 → 1.0.0），否则读 git tag
 *   npm run assets -- --channel v1   显式覆盖频道名
 *   npm run assets:check     导出题库并检查 48 张塔罗 + registry-v1.json
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
import { CHANNEL_NAME_RE, readAssetPointer, readGitChannelHints, resolveChannelName } from './asset-pointer.mjs'

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
// 真正上 COS 的只有 tarot/、题库 registry 与生图 manifest；generated-art 里的实验产物不上传
const stagedDir = path.join(root, 'tmp-publish-stage')
const REGISTRY_FILE = 'tests/registry-v1.json'
const exportRegistryScript = path.join(root, 'miniapp', 'content', 'export-registry.mjs')

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
  'tarot/ui/sanctuary-background-clay-v2.jpg',
  'tarot/ui/card-back-clay-v3.jpg',
]

const rawArgs = process.argv.slice(2)
const args = new Set(rawArgs)
const checkOnly = args.has('--check')
const yes = args.has('--yes')
const alsoBuild = args.has('--build')
const live = args.has('--live')

let channel = ''
try {
  channel = resolveChannelName(rawArgs, readGitChannelHints(root))
} catch (error) {
  die(error instanceof Error ? error.message : String(error))
}

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

function registryPath() {
  return path.join(assetDir, ...REGISTRY_FILE.split('/'))
}

function exportRegistry() {
  if (!fs.existsSync(exportRegistryScript)) die(`找不到题库导出脚本: ${exportRegistryScript}`)
  const exported = spawnSync(process.execPath, [exportRegistryScript], { stdio: 'inherit', cwd: root })
  if (exported.status !== 0) die(`导出 ${REGISTRY_FILE} 退出码 ${exported.status ?? 'null'}`)
}

/** 图+题一起上传时打修订号；只改题库的 assets:registry 不要打，避免玩家无谓重下塔罗图。 */
function stampAssetRev(file) {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'))
  payload.assetRev = new Date().toISOString()
  fs.writeFileSync(file, `${JSON.stringify(payload)}\n`)
  console.log(`[assets] assetRev ${payload.assetRev}（同名图靠 ?r= 刷新，不必升文件名）`)
}

/**
 * 只把 tarot/ 子树（48 张）、题库 registry 与生图 manifest.json 暂存再上传，
 * 避免把 generated-art 里的 avatar 等实验产物（100MB+）一起推上 COS。
 * 暂存目录名匹配 .gitignore 的 tmp* 规则，不产生未跟踪文件。
 */
function stagePublishDir() {
  fs.rmSync(stagedDir, { recursive: true, force: true })
  fs.mkdirSync(stagedDir, { recursive: true })
  fs.cpSync(path.join(assetDir, 'tarot'), path.join(stagedDir, 'tarot'), { recursive: true })
  const registry = registryPath()
  if (!fs.existsSync(registry)) die(`缺少 ${REGISTRY_FILE}。先跑 npm run content:export`)
  fs.mkdirSync(path.join(stagedDir, 'tests'), { recursive: true })
  fs.copyFileSync(registry, path.join(stagedDir, REGISTRY_FILE))
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

exportRegistry()
if (!fs.existsSync(registryPath())) die(`导出后仍缺少 ${REGISTRY_FILE}`)

const missing = missingTarot()
if (missing.length) {
  console.error(`[assets] 塔罗资源缺 ${missing.length}/${TAROT_FILES.length} 张，小程序会停在「资源加载失败」：`)
  for (const rel of missing) console.error(`  - art/generated-art/${rel}`)
  if (checkOnly || yes) die(`补齐 ${TAROT_FILES.length} 张后再发布`)
}

if (checkOnly) {
  console.log(`[assets] 塔罗 ${TAROT_FILES.length} 张齐全，已含 ${REGISTRY_FILE}`)
  process.exit(0)
}

stampAssetRev(registryPath())

if (!fs.existsSync(uploadScript)) die(`找不到 kit 上传脚本: ${uploadScript}`)

if (yes) {
  const missingEnv = ['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_BUCKET', 'COS_REGION']
    .filter((name) => !process.env[name]?.trim())
  if (missingEnv.length) {
    die(`缺少 ${missingEnv.join('、')}。写到本项目根 .env（已 gitignore，推荐）或 kit 仓库根 .env，不要写进任何入库文件`)
  }
}

if (live && channel) die('不要同时用 --live 和 --channel')
if (channel && !CHANNEL_NAME_RE.test(channel)) die(`非法频道名: ${channel}。tag 只能含字母数字、点、下划线和连字符`)

const pointer = readAssetPointer(envOut)
if (live && !pointer) die('缺少 .asset-base-url，无法热更到玩家已在用的指针。先发版写入指针，或用 --channel v1 建稳定频道')

const prefix = pointer && live ? pointer.prefix : readPrefix()
const version = live ? pointer.version : channel || gitShortSha()
const base = publicBase() || pointer?.origin || ''
const assetBaseUrl = base ? `${base}/${prefix}/${version}` : ''
const rewritePointer = yes && !live
const shouldBuild = yes && alsoBuild && !live

if (!live && pointer && pointer.version !== version) {
  console.warn(`[assets] 警告：将写入新目录 ${prefix}/${version}/，当前指针是 ${pointer.version}。已上架包看不到这次上传。热更请用 npm run assets:hot`)
}

console.log(`[assets] 目录 ${assetDir}（仅上传 tarot/ + ${REGISTRY_FILE} + manifest.json）`)
console.log(`[assets] COS 路径 ${prefix}/${version}/${live ? '（覆盖玩家指针，不改频道）' : ''}`)
if (assetBaseUrl) console.log(`[assets] ${live ? '热更目标' : '构建地址'} ${assetBaseUrl}`)
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

// 题库 registry 单独按 short(60s) 缓存补传：kit upload-cos 默认 immutable（对版本目录资产正确），
// 但 registry 走「同地址覆盖热更」语义——immutable 头会让已访问过的客户端缓存一年不重验证，
// 后续 60s 热更永远到不了它们（2026-09-15 实测事故）。
if (yes) {
  const registryStage = path.join(root, 'tmp-publish-stage-registry')
  fs.rmSync(registryStage, { recursive: true, force: true })
  fs.mkdirSync(path.join(registryStage, 'tests'), { recursive: true })
  fs.copyFileSync(registryPath(), path.join(registryStage, REGISTRY_FILE))
  const registryUpload = spawnSync(process.execPath, [
    uploadScript,
    '--dir', registryStage,
    '--prefix', prefix,
    '--version', version,
    '--cache', 'short',
    '--yes',
  ], { stdio: 'inherit', cwd: root, env: process.env })
  fs.rmSync(registryStage, { recursive: true, force: true })
  if (registryUpload.status !== 0) die(`registry short 缓存补传退出码 ${registryUpload.status ?? 'null'}`)
  console.log('[assets] registry 已按 short(60s) 缓存覆盖补传')
} else {
  console.log('[assets] dry-run：正式上传时 registry 会单独按 short(60s) 缓存补传')
}

if (rewritePointer && assetBaseUrl) {
  fs.writeFileSync(envOut, `${assetBaseUrl}\n`, 'utf8')
  console.log(`[assets] 已写入 ${envOut}`)
} else if (yes && live) {
  console.log('[assets] 热更完成：未改 .asset-base-url，未重建。玩家包指针不变')
} else if (yes) {
  console.log(`[assets] 上传完成。把 TARO_ASSET_BASE_URL 设为 https://<你的域名>/${prefix}/${version} 后重建`)
}

if (shouldBuild) {
  console.log('[assets] 开始重建小程序…')
  const build = spawnSync(process.execPath, [
    path.join(root, 'scripts', 'with-asset-env.mjs'),
    'npm', '--prefix', 'miniapp', 'run', 'build:weapp',
  ], { stdio: 'inherit', cwd: root, env: process.env })
  if (build.status !== 0) die(`小程序构建退出码 ${build.status ?? 'null'}`)
  console.log('[assets] 完成。微信开发者工具导入 miniapp 目录，清缓存后编译')
} else if (yes && !live) {
  console.log('[assets] 下一步：npm run build:weapp   （会自动读取该地址）')
  console.log('[assets] 微信公众平台 → 开发管理 → 开发设置 → downloadFile 合法域名，加入 COS/CDN 的 HTTPS 域名')
} else if (!yes) {
  console.log(`[assets] dry-run 完成。确认清单后执行 npm run ${live ? 'assets:hot' : 'assets'}`)
}
