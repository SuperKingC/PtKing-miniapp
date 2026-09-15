// 动画验证:800ms 间隔连拍,对奖牌区域做像素差;并滚动查看 solo 奖牌
const automator = require('miniprogram-automator')
const path = require('node:path')
const fs = require('node:fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  let mini
  for (let i = 0; i < 20; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' }); break } catch (e) { await sleep(2000) }
  }
  if (!mini) throw new Error('connect 9420 failed')
  await mini.reLaunch('/pages/test/index')
  await sleep(2800)
  await mini.screenshot({ path: path.join(__dirname, '..', 'verify-shots', 'anim-f0.png') })
  await sleep(640)
  await mini.screenshot({ path: path.join(__dirname, '..', 'verify-shots', 'anim-f1.png') })
  await sleep(300)
  await mini.pageScrollTo(700)
  await sleep(1400)
  await mini.screenshot({ path: path.join(__dirname, '..', 'verify-shots', 'anim-solo.png') })
  await mini.disconnect()

  // 帧差:上半部卡片角标区域
  const zlib = require('node:zlib')
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
  const f0 = readPNG(path.join(__dirname, '..', 'verify-shots', 'anim-f0.png'))
  const f1 = readPNG(path.join(__dirname, '..', 'verify-shots', 'anim-f1.png'))
  if (f0.w !== f1.w || f0.h !== f1.h) throw new Error('尺寸不一致')
  // 奖牌区域估计:x 8..60, y 0.42h..0.75h(两卡角标)
  const y0 = Math.round(f0.h * 0.42), y1 = Math.round(f0.h * 0.75)
  let diff = 0, checked = 0
  for (let y = y0; y < y1; y++) for (let x = 4; x < 64; x++) {
    const o = (y * f0.w + x) * f0.channels
    const d = Math.abs(f0.out[o] - f1.out[o]) + Math.abs(f0.out[o + 1] - f1.out[o + 1]) + Math.abs(f0.out[o + 2] - f1.out[o + 2])
    checked++
    if (d > 18) diff++
  }
  console.log(`角标区域采样 ${checked}px, 帧间变化 ${diff}px (${((diff / checked) * 100).toFixed(1)}%) → ${diff > 40 ? '动画在动 ✓' : '疑似静止 ✗'}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
