#!/usr/bin/env node
/**
 * 若根目录存在 .asset-base-url，则注入 TARO_ASSET_BASE_URL 再执行后续命令。
 * 已有环境变量时不覆盖，方便 CI / 临时改指向。
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFile = path.join(root, '.asset-base-url')
if (!process.env.TARO_ASSET_BASE_URL && fs.existsSync(envFile)) {
  const url = fs.readFileSync(envFile, 'utf8').trim()
  if (url) process.env.TARO_ASSET_BASE_URL = url
}

const [cmd, ...args] = process.argv.slice(2)
if (!cmd) {
  console.error('用法: node scripts/with-asset-env.mjs <命令> [...参数]')
  process.exit(1)
}

const child = spawn(cmd, args, { stdio: 'inherit', shell: true, env: process.env, cwd: root })
child.on('exit', (code) => process.exit(code ?? 1))
