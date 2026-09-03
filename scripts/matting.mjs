#!/usr/bin/env node
/**
 * 抠图包装器:调 miniapp-kit/matting/solid_bg_matting.py,参数原样透传。
 *
 * 为什么包一层:matting 需要 cv2/torch 的 Python 环境,系统 python 没有这些依赖;
 * 解释器路径是单点配置,存在 kit 仓库根 .env 的 PYTHON_MATTING(不进任何 git),
 * 这里读取后拉起子进程,用户不需要 setx。BEN2/SAM2 权重路径由 py 脚本自己从 kit .env 加载。
 *
 * 用法: npm run art:matting -- <图片> <输出目录> [--method ben2|chroma|sam2|both] [其他原样透传]
 * kit 仓库默认按同级目录解析(本项目根旁的 ../miniapp-kit,本脚本在 scripts/ 下故为 ../../),可用 MINIAPP_KIT_DIR 覆盖。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const kitRoot = process.env.MINIAPP_KIT_DIR
  ? path.resolve(process.env.MINIAPP_KIT_DIR)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../miniapp-kit')
const script = path.join(kitRoot, 'matting', 'solid_bg_matting.py')
if (!fs.existsSync(script)) {
  console.error(`[matting] 找不到 kit 抠图脚本: ${script}`)
  process.exit(1)
}

let envPython = ''
try {
  for (const line of fs.readFileSync(path.join(kitRoot, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*PYTHON_MATTING\s*=\s*(.*)\s*$/)
    if (m && process.env.PYTHON_MATTING === undefined) envPython = m[1].replace(/^["']|["']$/g, '').trim()
  }
} catch { /* kit 无 .env 时跳过,回退 PATH python */ }

const py = process.env.PYTHON_MATTING || envPython || 'python'
if (py === 'python') {
  console.error('[matting] 提醒:未找到 PYTHON_MATTING,用 PATH python(系统 python 通常缺 cv2/torch,会 ImportError);kit 仓库根 .env 里配置即可。')
}
const args = process.argv.slice(2)
if (args.length === 0) args.push('--help')
const r = spawnSync(py, [script, ...args], { stdio: 'inherit' })
if (r.error) console.error(`[matting] 启动失败: ${r.error.message}(解释器: ${py})`)
process.exit(r.status ?? 1)
