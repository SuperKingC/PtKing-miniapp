// 本任务验收:热门榜顺序/人气降序/meta 单行/角标新落位
const automator = require('miniprogram-automator')
const path = require('node:path')
const zlib = require('node:zlib')
const fs = require('node:fs')
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
  const buf = fs.readFileSync(p)
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
    const cur = out.subarray(y * bpp, y * bpp + bpp)
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
function crop3x(src, out, crop, S) {
  const px = readPNG(src)
  const w2 = crop.w * S, h2 = crop.h * S
  const rgb = Buffer.alloc(w2 * h2 * 3)
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    const sx = crop.x + Math.floor(x / S), sy = crop.y + Math.floor(y / S)
    const o = (sy * px.w + sx) * px.channels, o2 = (y * w2 + x) * 3
    if (px.colorType === 3) { const idx = px.out[o]; rgb[o2] = idx; rgb[o2 + 1] = idx; rgb[o2 + 2] = idx }
    else { rgb[o2] = px.out[o]; rgb[o2 + 1] = px.out[o + 1]; rgb[o2 + 2] = px.out[o + 2] }
  }
  fs.writeFileSync(out, writePNG(w2, h2, rgb))
}

async function main() {
  let mini
  for (let i = 0; i < 20; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' }); break } catch (e) { await sleep(2000) }
  }
  if (!mini) throw new Error('connect 9420 failed')
  const page = await mini.reLaunch('/pages/test/index')
  await sleep(3200)

  const texts = async (sel) => {
    const els = await page.$$(sel)
    const out = []
    for (const el of els) out.push((await el.text() || '').trim())
    return out
  }
  const sections = await texts('.test-page__section-title')
  const titles = await texts('.test-page__card-title')
  const metas = await texts('.test-page__card-meta')
  console.log('SECTIONS:', JSON.stringify(sections))
  console.log('TITLES:', JSON.stringify(titles, null, 0))
  console.log('METAS:')
  metas.forEach((m, i) => console.log(' ', i, JSON.stringify(m)))

  const full = path.join(shots, 'hotlist-meta-full.png')
  await mini.screenshot({ path: full })
  await mini.disconnect()

  // 顶部三卡区域 3x(角标+meta),视口按 1280 宽截图估算:卡片从 ~0.34h 开始
  const px = readPNG(full)
  const y0 = Math.round(px.h * 0.30), h = Math.round(px.h * 0.42)
  crop3x(full, path.join(shots, 'hotlist-cards-3x.png'), { x: 0, y: y0, w: px.w, h }, 3)
  console.log('full', px.w + 'x' + px.h, '-> crop', px.w + 'x' + h, '@y' + y0)
}
main().catch((e) => { console.error(e); process.exit(1) })
