// 诊断:角标 PNG alpha/灰色残留可视化(4x 放大;黑=透明,灰=半透明,红=不透明去饱和灰,白=其余不透明)
const fs = require('fs')
const zlib = require('zlib')

function decodePNG(p) {
  const buf = fs.readFileSync(p)
  let off = 8; const idat = []; let w, h, colorType, pallette = null, trns = null
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9] }
    if (type === 'PLTE') pallette = Buffer.from(data)
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
  return { w, h, colorType, pallette, trns, out, bpp: w * channels, channels }
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
function encodePNG(w, h, rgb) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  const rawBuf = Buffer.alloc(h * (w * 3 + 1))
  for (let y = 0; y < h; y++) { rawBuf[y * (w * 3 + 1)] = 0; rgb.subarray(y * w * 3, (y + 1) * w * 3).copy(rawBuf, y * (w * 3 + 1) + 1) }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rawBuf)), chunk('IEND', Buffer.alloc(0))])
}

const name = process.argv[2]
const px = decodePNG('D:/Mine/PtKing-miniapp/miniapp/src/assets/illus/' + name + '.png')
const { w, h } = px
const alpha = (x, y) => {
  if (px.colorType === 3) { const idx = px.out[y * px.bpp + x]; return px.trns && idx < px.trns.length ? px.trns[idx] : 255 }
  const i = y * px.bpp + x * px.channels
  if (px.colorType === 6) return px.out[i + 3]
  return 255
}
const rgb = (x, y) => {
  if (px.colorType === 3) { const idx = px.out[y * px.bpp + x]; return [px.pallette[idx * 3], px.pallette[idx * 3 + 1], px.pallette[idx * 3 + 2]] }
  const i = y * px.bpp + x * px.channels; return [px.out[i], px.out[i + 1], px.out[i + 2]]
}
const out = Buffer.alloc(w * h * 3)
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const a = alpha(x, y); const [r, g, b] = rgb(x, y); const o = (y * w + x) * 3
  if (a === 0) { out[o] = 25; out[o + 1] = 25; out[o + 2] = 25 }
  else if (a < 255) { out[o] = 100; out[o + 1] = 100; out[o + 2] = 100 }
  else {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    if (mx - mn < 18 && mx < 242) { out[o] = 255; out[o + 1] = 40; out[o + 2] = 40 }
    else { out[o] = 235; out[o + 1] = 235; out[o + 2] = 235 }
  }
}
const S = 4, w2 = w * S, h2 = h * S
const out2 = Buffer.alloc(w2 * h2 * 3)
for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
  const o2 = (y * w2 + x) * 3, o = (Math.floor(y / S) * w + Math.floor(x / S)) * 3
  out2[o2] = out[o]; out2[o2 + 1] = out[o + 1]; out2[o2 + 2] = out[o + 2]
}
fs.writeFileSync('D:/Mine/PtKing-miniapp/miniapp/art/verify-shots/diag-badge-' + name + '.png', encodePNG(w2, h2, out2))
console.log('wrote diag-badge-' + name + '.png')
