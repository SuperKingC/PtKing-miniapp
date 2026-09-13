#!/usr/bin/env python
"""塔罗 clay 牌背重出落位(2026-09-13)。

背景:旧 card-back-clay.jpg 是 2:3 生图产物,牌本体只占画面中央一小块(牌比例 ~0.55,
四周留奶油底色),而牌位方框比例是 196/310≈0.632。aspectFill 后四周露出底色、
左侧尤甚(实测覆盖 66.5%,左侧奶油边 9.5%) → 用户反馈「塔罗牌没有铺满」。

已用 `npm run art` 以旧牌背为 --ref 重出满幅出血版(art/prompts-tarot-cardback-v2r.txt
的三张候选),牌外沿圆角紧贴画面四边、色板与徽章不变。本次采用用户选定的 v2r1。
本脚本把它等比降到 768 宽并编码 JPEG，输出新版本
art/generated-art/tarot/ui/card-back-clay-v2.jpg。

用法: python miniapp/art/tarot-cardback/prepare-cardback.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / 'art/generated-art/tarot-cardback-v2r/tarot-clay-cardback-v2r1.png'
DST = ROOT / 'art/generated-art/tarot/ui/card-back-clay-v2.jpg'
WIDTH = 768
QUALITY = 90
MAX_KB = 180


def main() -> None:
    im = Image.open(SRC).convert('RGB')
    height = round(im.height * WIDTH / im.width)
    im = im.resize((WIDTH, height), Image.LANCZOS)
    DST.parent.mkdir(parents=True, exist_ok=True)
    im.save(DST, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    size_kb = DST.stat().st_size / 1024
    flag = 'OK' if size_kb <= MAX_KB else '❌ 超红线'
    print(f'{SRC.name} -> {DST.relative_to(ROOT)} {im.size[0]}x{im.size[1]} {size_kb:.0f}KB q{QUALITY} {flag}')
    if size_kb > MAX_KB:
        raise RuntimeError(f'{DST} exceeds {MAX_KB}KB')


if __name__ == '__main__':
    main()
