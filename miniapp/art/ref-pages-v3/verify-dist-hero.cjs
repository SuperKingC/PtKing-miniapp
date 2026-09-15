// 一次性：核验 dist 中 hero 资产引用与产物
const fs = require('node:fs')
const path = require('node:path')
const hits = []
function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name)
    if (f.isDirectory()) walk(p)
    else if (/\.(js|wxml|wxss)$/.test(f.name)) {
      const s = fs.readFileSync(p, 'utf8')
      for (const v of ['hero-card-v11', 'hero-card-v13', 'hero-card-v14']) {
        if (s.includes(v)) hits.push(p.split(path.sep).join('/') + ': ' + v)
      }
    }
  }
}
walk(path.join(__dirname, '..', '..', 'dist'))
console.log(hits.join('\n') || '(无引用)')
console.log('--- dist/assets/illus/hero-card*:')
const dir = path.join(__dirname, '..', '..', 'dist', 'assets', 'illus')
for (const f of fs.readdirSync(dir)) {
  if (f.includes('hero-card')) console.log(' ', f, fs.statSync(path.join(dir, f)).size, 'bytes')
}
