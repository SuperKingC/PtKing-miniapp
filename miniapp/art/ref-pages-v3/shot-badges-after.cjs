// 角标验收截图:热门榜区域高清截取(放大 IDE 模拟器 viewPort 由 IDE 决定,这里直接整页+裁切放大)
const automator = require('miniprogram-automator')
const path = require('node:path')
const zlib = require('node:zlib')
const shots = path.join(__dirname, '..', 'verify-shots')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let crcTable = []
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0 }
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii'); const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0)
  return Buffer.concat([len, t, data, crc])
}
function readPNG(p) {
  const buf = require('node:fs').readFileSync(p)
  let off = 8; const idat = []; let w, h, colorType
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9] }
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
  return { w, h, colorType, channels, out, bpp }
}
function writePNG(w, h, rgb) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  const rawBuf = Buffer.alloc(h * (w * 3 + 1))
  for (let y = 0; y < h; y++) { rawBuf[y * (w * 3 + 1)] = 0; rgb.subarray(y * w * 3, (y + 1) * w * 3).copy(rawBuf, y * (w * 3 + 1) + 1) }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rawBuf)), chunk('IEND', Buffer.alloc(0))])
}

async function main() {
  let mini
  for (let i = 0; i < 20; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' }); break } catch (e) { await sleep(2000) }
  }
  if (!mini) throw new Error('connect 9420 failed')
  await mini.reLaunch('/pages/test/index')
  await sleep(2800)
  await mini.screenshot({ path: path.join(shots, 'badges-after-full.png') })
  await mini.disconnect()

  // 裁切热门榜三卡区域并 3x 放大
  const px = readPNG(path.join(shots, 'badges-after-full.png'))
  const crop = { x: 0, y: Math.round(px.h * 0.42), w: px.w, h: Math.round(px.h * 0.36) }
  const S = 3
  const w2 = crop.w * S, h2 = crop.h * S
  const rgb = Buffer.alloc(w2 * h2 * 3)
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[px.colorType]
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    const sx = crop.x + Math.floor(x / S), sy = crop.y + Math.floor(y / S)
    const o = (sy * px.w + sx) * ch, o2 = (y * w2 + x) * 3
    if (px.colorType === 6) { rgb[o2] = px.out[o]; rgb[o2 + 1] = px.out[o + 1]; rgb[o2 + 2] = px.out[o + 2] }
    else if (px.colorType === 2) { rgb[o2] = px.out[o]; rgb[o2 + 1] = px.out[o + 1]; rgb[o2 + 2] = px.out[o + 2] }
    else if (px.colorType === 3) { const idx = px.out[o]; rgb[o2] = idx; rgb[o2 + 1] = idx; rgb[o2 + 2] = idx }
  }
  require('node:fs').writeFileSync(path.join(shots, 'badges-after-cards.png'), writePNG(w2, h2, rgb))
  console.log('full', px.w + 'x' + px.h, '-> cards crop', w2 + 'x' + h2)
}
main().catch((e) => { console.error(e); process.exit(1) })
