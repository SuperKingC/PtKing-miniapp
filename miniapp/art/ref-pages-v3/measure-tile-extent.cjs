// tile 图标烘焙实体尺寸核查：按 alpha 阈值分级量外边缘 bbox（实体 ≥250 / 中间 ≥128 / 含软影 ≥16）
const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

function readPNG(p) {
  const buf = fs.readFileSync(p)
  let off = 8
  const idat = []
  let w, h, ct, bd
  let plte = null
  let trns = null
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const ty = buf.toString('ascii', off + 4, off + 8)
    const d = buf.subarray(off + 8, off + 8 + len)
    if (ty === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9] }
    if (ty === 'PLTE') plte = d
    if (ty === 'tRNS') trns = d
    if (ty === 'IDAT') idat.push(d)
    off += 12 + len
  }
  if (bd !== 8) throw new Error(`bit depth ${bd} not supported for ${p}`)
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct]
  const bpp = w * ch
  const out = Buffer.alloc(h * bpp)
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (bpp + 1)]
    const line = raw.subarray(y * (bpp + 1) + 1, (y + 1) * (bpp + 1))
    const prev = y > 0 ? out.subarray((y - 1) * bpp, y * bpp) : Buffer.alloc(bpp)
    const cur = out.subarray(y * bpp, (y + 1) * bpp)
    for (let x = 0; x < bpp; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0
      let v = line[x]
      if (filter === 1) v = (v + a) & 255
      else if (filter === 2) v = (v + b) & 255
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255
      else if (filter === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) & 255 }
      cur[x] = v & 255
    }
  }
  // 统一展开成 alpha 通道
  const alpha = Buffer.alloc(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * ch
      if (ct === 6) alpha[y * w + x] = out[o + 3]
      else if (ct === 4) alpha[y * w + x] = out[o + 1]
      else if (ct === 3) alpha[y * w + x] = trns && out[o] < trns.length ? trns[out[o]] : 255
      else alpha[y * w + x] = 255
    }
  }
  return { w, h, alpha }
}

function bbox(px, threshold) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1
  for (let y = 0; y < px.h; y++) {
    for (let x = 0; x < px.w; x++) {
      if (px.alpha[y * px.w + x] >= threshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

const dir = path.join(__dirname, '..', '..', 'src', 'assets', 'illus')
const tiles = [
  'tile-mbti-v10.png',
  'tile-star-v10.png',
  'tile-love-v10.png',
  'tile-career-v35.png',
  'tile-fun-v39.png',
]
for (const t of tiles) {
  const px = readPNG(path.join(dir, t))
  const solid = bbox(px, 250)
  const mid = bbox(px, 128)
  const soft = bbox(px, 16)
  const fmt = (b) => (b ? `(${b.x},${b.y}) ${b.w}x${b.h}` : '无')
  console.log(`${t}  画布 ${px.w}x${px.h}`)
  console.log(`  实体(α≥250): ${fmt(solid)}   中间(α≥128): ${fmt(mid)}   含软影(α≥16): ${fmt(soft)}`)
}
