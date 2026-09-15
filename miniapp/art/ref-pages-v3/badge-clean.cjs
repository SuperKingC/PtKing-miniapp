// 角标残留清理:拟合奖牌圆 → 圆外(alpha)与圆缘低饱和灰(接触影)置透明,调色板 PNG8 就地重映射
// 用法:node badge-clean.cjs badge-top1-v1 [badge-top3-v1 ...]
const fs = require('fs')
const zlib = require('zlib')

function decodePNG(p) {
  const buf = fs.readFileSync(p)
  let off = 8; const idat = []; let w, h, bitDepth, colorType, palette = null, trns = null
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9] }
    if (type === 'PLTE') palette = Buffer.from(data)
    if (type === 'tRNS') trns = Buffer.from(data)
    if (type === 'IDAT') idat.push(data)
    off += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType]
  const bpp = w * channels
  const out = Buffer.alloc(h * bpp)
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (bpp + 1)]
    const line = raw.subarray(y * (bpp + 1) + 1, (y + 1) * (bpp + 1))
    const prev = y > 0 ? out.subarray((y - 1) * bpp, y * bpp) : Buffer.alloc(bpp)
    const cur = out.subarray(y * bpp, (y + 1) * bpp)
    for (let x = 0; x < bpp; x++) {
      const a = x >= channels ? cur[x - channels] : 0, b = prev[x], c = x >= channels ? prev[x - channels] : 0
      let v = line[x]
      if (filter === 1) v = (v + a) & 255
      else if (filter === 2) v = (v + b) & 255
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255
      else if (filter === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255 }
      cur[x] = v
    }
  }
  return { w, h, bitDepth, colorType, palette, trns, out, bpp, channels }
}

let crcTable = []
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0 }
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii'); const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0)
  return Buffer.concat([len, t, data, crc])
}
function encodePNG8(w, h, palette, trns, indices) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 3
  const rawBuf = Buffer.alloc(h * (w + 1))
  for (let y = 0; y < h; y++) { rawBuf[y * (w + 1)] = 0; indices.subarray(y * w, (y + 1) * w).copy(rawBuf, y * (w + 1) + 1) }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('PLTE', palette),
    trns && trns.length ? chunk('tRNS', trns) : Buffer.alloc(0),
    chunk('IDAT', zlib.deflateSync(rawBuf, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const name of process.argv.slice(2)) {
  const file = 'D:/Mine/PtKing-miniapp/miniapp/src/assets/illus/' + name + '.png'
  const px = decodePNG(file)
  const { w, h } = px
  if (px.colorType !== 3) throw new Error(name + ' 不是 PNG8 调色板图')
  // 每像素取 (r,g,b,alpha)
  const rgba = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const idx = px.out[i]
    rgba[i * 4] = px.palette[idx * 3]; rgba[i * 4 + 1] = px.palette[idx * 3 + 1]; rgba[i * 4 + 2] = px.palette[idx * 3 + 2]
    rgba[i * 4 + 3] = px.trns && idx < px.trns.length ? px.trns[idx] : 255
  }
  const alpha = (x, y) => rgba[(y * w + x) * 4 + 3]
  const sat = (x, y) => { const o = (y * w + x) * 4; return Math.max(rgba[o], rgba[o + 1], rgba[o + 2]) - Math.min(rgba[o], rgba[o + 1], rgba[o + 2]) }

  // 1) 上半球带(y 12%~62%)取不透明左右边界点,Kasa 最小二乘拟合圆
  const pts = []
  const y0 = Math.round(h * 0.12), y1 = Math.round(h * 0.62)
  for (let y = y0; y <= y1; y += 2) {
    let minX = -1, maxX = -1
    for (let x = 0; x < w; x++) if (alpha(x, y) >= 128) { if (minX < 0) minX = x; maxX = x }
    if (minX >= 0) { pts.push([minX, y]); pts.push([maxX, y]) }
  }
  // Kasa: 最小化 Σ(x²+y² + D·x + E·y + F)²
  let Sx = 0, Sy = 0, Sxx = 0, Sxy = 0, Syy = 0, Sxz = 0, Syz = 0, Sz = 0, n = pts.length
  for (const [x, y] of pts) {
    const z = x * x + y * y
    Sx += x; Sy += y; Sxx += x * x; Sxy += x * y; Syy += y * y; Sxz += x * z; Syz += y * z; Sz += z
  }
  // 解 [Sxx Sxy Sx; Sxy Syy Sy; Sx Sy n]·[D E F] = -[Sxz Syz Sz]
  const m = [
    [Sxx, Sxy, Sx, -Sxz],
    [Sxy, Syy, Sy, -Syz],
    [Sx, Sy, n, -Sz],
  ]
  for (let col = 0; col < 3; col++) {
    let piv = col
    for (let r = col + 1; r < 3; r++) if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r
    ;[m[col], m[piv]] = [m[piv], m[col]]
    for (let r = col + 1; r < 3; r++) {
      const f = m[r][col] / m[col][col]
      for (let c = col; c < 4; c++) m[r][c] -= f * m[col][c]
    }
  }
  const solve = []
  for (let i = 2; i >= 0; i--) {
    let s = m[i][3]
    for (let j = i + 1; j < 3; j++) s -= m[i][j] * solve[j]
    solve[i] = s / m[i][i]
  }
  const D = solve[0], Eo = solve[1], F = solve[2]
  const cx = -D / 2, cy = -Eo / 2, r = Math.sqrt(D * D / 4 + Eo * Eo / 4 - F)
  console.log(`${name}: 圆心(${cx.toFixed(1)},${cy.toFixed(1)}) r=${r.toFixed(1)}`)

  // 2) 残差评估(带内点)
  let maxDev = 0
  for (const [x, y] of pts) {
    const d = Math.abs(Math.hypot(x - cx, y - cy) - r)
    if (d > maxDev) maxDev = d
  }
  console.log(`  带内边界最大残差 ${maxDev.toFixed(1)}px`)

  // 3) 清理:圆外(r+marginHard)一律透明;圆缘带(r+1.5 ~ r+marginHard)低饱和灰透明
  const marginHard = Math.min(5, Math.max(2.5, maxDev + 2))
  let removed = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = alpha(x, y)
    if (a === 0) continue
    const d = Math.hypot(x - cx, y - cy)
    const kill = d > r + marginHard || (d > r + 1.5 && sat(x, y) < 12)
    if (kill) { rgba[(y * w + x) * 4 + 3] = 0; removed++ }
  }
  console.log(`  清除 ${removed}px (marginHard=${marginHard.toFixed(1)})`)

  // 4) 重建索引:被清像素 → 全透明索引(无则追加),其余像素原索引不变
  let paletteArr = []
  for (let i = 0; i < px.palette.length / 3; i++) {
    paletteArr.push([px.palette[i * 3], px.palette[i * 3 + 1], px.palette[i * 3 + 2], px.trns && i < px.trns.length ? px.trns[i] : 255])
  }
  let transparentIdx = paletteArr.findIndex((e) => e[3] === 0)
  if (transparentIdx < 0 && paletteArr.length < 256) { paletteArr.push([0, 0, 0, 0]); transparentIdx = paletteArr.length - 1 }
  if (transparentIdx < 0) throw new Error(name + ' 调色板满且无透明项')
  const indices = Buffer.alloc(w * h)
  for (let i = 0; i < w * h; i++) {
    if (rgba[i * 4 + 3] === 0) { indices[i] = transparentIdx; continue }
    indices[i] = px.out[i]
  }
  const palBuf = Buffer.alloc(paletteArr.length * 3)
  const trnsBuf = Buffer.alloc(paletteArr.length)
  paletteArr.forEach((e, i) => { palBuf[i * 3] = e[0]; palBuf[i * 3 + 1] = e[1]; palBuf[i * 3 + 2] = e[2]; trnsBuf[i] = e[3] })
  fs.writeFileSync(file, encodePNG8(w, h, palBuf, trnsBuf, indices))
  console.log(`  写回 ${file} (${fs.statSync(file).size}B)`)
}
