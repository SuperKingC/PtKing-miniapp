#!/usr/bin/env node
/**
 * post-build CJK 还原：把 Taro 产物 JS 里的 \uXXXX 中文转义还原成 UTF-8 原文。
 *
 * 为什么：压缩器默认 ascii 输出，全部中文变成 6 字节 \uXXXX 转义（common.js 里的题库
 * 内容 ≈13.6 万个转义 ≈816KB，占主包大头）。还原成 3 字节 UTF-8 可省 ~400KB。
 * 小程序 JS 以 UTF-8 读取，原文中文合法且与转义完全等价。
 *
 * 安全边界：只转换码点 ≥0x2E80 的转义（CJK 及其后区段，永不为语法字符），
 * 排除代理对 0xD800-0xDFFF（emoji 需成对保留）、排除引号/反斜杠/换行等 <0x2E80 语法区。
 * 对每一处转义逐个判断，可安全用于字符串/正则/模板字面量。
 */
const fs = require('fs')
const path = require('path')

const DIST = path.resolve(__dirname, '..', 'miniapp', 'dist')

function deescape(source) {
  return source.replace(/\\u([0-9a-fA-F]{4})/g, (raw, hex) => {
    const code = parseInt(hex, 16)
    if (code >= 0x2e80 && code <= 0xffff && !(code >= 0xd800 && code <= 0xdfff)) {
      return String.fromCharCode(code)
    }
    return raw
  })
}

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (name.endsWith('.js') && !name.endsWith('.LICENSE.txt')) out.push(full)
  }
  return out
}

const files = walk(DIST, [])
let before = 0
let after = 0
let changed = 0
for (const file of files) {
  const size = fs.statSync(file).size
  before += size
  const text = fs.readFileSync(file, 'utf8')
  if (!text.includes('\\u')) continue
  const converted = deescape(text)
  if (converted === text) continue
  fs.writeFileSync(file, converted, 'utf8')
  after += fs.statSync(file).size
  changed++
}
console.log(`[post-build-cjk] ${changed}/${files.length} 个 JS 还原中文转义，${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`)
