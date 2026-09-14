#!/usr/bin/env node
/**
 * 把题库 registry 传到当前构建正在用的 COS 版本目录（读 .asset-base-url）。
 * 不改资产根、不重建小程序：已发布包可热更题库。
 * JSON 用短缓存，避免 kit 全量上传的 immutable 一年头把题库钉死。
 *
 *   npm run assets:registry          导出正式题库并真传
 *   npm run assets:registry:probe    追加「COS 热更探针」后真传，验收完再跑上一行撤回
 *   node scripts/publish-registry.mjs         dry-run
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readAssetPointer } from './asset-pointer.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const kitRoot = process.env.MINIAPP_KIT_DIR
  ? path.resolve(process.env.MINIAPP_KIT_DIR)
  : path.resolve(root, '../miniapp-kit')
const assetDir = path.join(root, 'art', 'generated-art')
const envOut = path.join(root, '.asset-base-url')
const localEnvPath = path.join(root, '.env')
const kitEnvPath = path.join(kitRoot, '.env')
const exportScript = path.join(root, 'miniapp', 'content', 'export-registry.mjs')
const REGISTRY_FILE = 'tests/registry-v1.json'
const probePath = path.join(root, 'miniapp', 'content', 'hot-update-probe.json')
const yes = process.argv.includes('--yes')
const probe = process.argv.includes('--probe')

function die(msg) {
  console.error(`[registry] ${msg}`)
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

function liveAssetRoot() {
  try {
    const pointer = readAssetPointer(envOut)
    if (!pointer) die('缺少 .asset-base-url，先 npm run assets:publish')
    return {
      ...pointer,
      objectUrl: `${pointer.base}/${REGISTRY_FILE}`,
    }
  } catch (error) {
    die(error instanceof Error ? error.message : String(error))
  }
}

loadDotEnv(localEnvPath)
loadDotEnv(kitEnvPath)

if (!fs.existsSync(exportScript)) die(`找不到导出脚本: ${exportScript}`)
const exported = spawnSync(process.execPath, [exportScript], { stdio: 'inherit', cwd: root })
if (exported.status !== 0) die(`导出退出码 ${exported.status ?? 'null'}`)

const localFile = path.join(assetDir, ...REGISTRY_FILE.split('/'))
if (!fs.existsSync(localFile)) die(`导出后仍缺少 ${localFile}`)

if (probe) {
  if (!fs.existsSync(probePath)) die(`缺少探针定义: ${probePath}`)
  const payload = JSON.parse(fs.readFileSync(localFile, 'utf8'))
  const probeDef = JSON.parse(fs.readFileSync(probePath, 'utf8'))
  if (!probeDef?.id || !probeDef?.title) die('探针 JSON 缺少 id/title')
  const tests = Array.isArray(payload.tests) ? payload.tests.filter((item) => item?.id !== probeDef.id) : []
  tests.push(probeDef)
  payload.tests = tests
  fs.writeFileSync(localFile, `${JSON.stringify(payload)}\n`)
  console.log(`[registry] 已注入探针 ${probeDef.id}「${probeDef.title}」`)
}

const live = liveAssetRoot()
const key = [live.prefix, live.version, REGISTRY_FILE].filter(Boolean).join('/')
const size = fs.statSync(localFile).size
console.log(`[registry] ${localFile} → ${key} (${(size / 1024).toFixed(0)}KB)`)
console.log(`[registry] 小程序将请求 ${live.objectUrl}`)

if (!yes) {
  console.log('[registry] dry-run 完成。确认后执行 npm run assets:registry')
  process.exit(0)
}

const missingEnv = ['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_BUCKET', 'COS_REGION']
  .filter((name) => !process.env[name]?.trim())
if (missingEnv.length) {
  die(`缺少 ${missingEnv.join('、')}。写到本项目根 .env 或 kit 仓库根 .env`)
}

let COS
try {
  const require = createRequire(path.join(kitRoot, 'package.json'))
  COS = require('cos-nodejs-sdk-v5')
} catch {
  die('缺少 cos-nodejs-sdk-v5。在 miniapp-kit 仓库根执行 npm i')
}

const client = new COS({ SecretId: process.env.COS_SECRET_ID, SecretKey: process.env.COS_SECRET_KEY })
await new Promise((resolve, reject) => {
  client.putObject({
    Bucket: process.env.COS_BUCKET,
    Region: process.env.COS_REGION,
    Key: key,
    Body: fs.createReadStream(localFile),
    ContentLength: size,
    ContentType: 'application/json; charset=utf-8',
    ContentDisposition: 'inline',
    CacheControl: 'public, max-age=60, must-revalidate',
  }, (err) => (err ? reject(err) : resolve()))
})
console.log(`[registry] 已上传 ${live.objectUrl}`)
if (probe) {
  console.log('[registry] 验收：微信开发者工具点「编译」或切后台再回来，测试中心应出现「COS 热更探针」')
  console.log('[registry] 撤回：npm run assets:registry 后再编译一次，探针应消失')
} else {
  console.log('[registry] 切后台再回来或点「编译」即可拉取；无需重建。同 id 覆盖、新 id 追加，失败仍走包内静态题库')
}
