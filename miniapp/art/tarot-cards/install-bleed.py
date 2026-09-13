#!/usr/bin/env python
"""把重出的满幅出血牌面落位(2026-09-13)。

输入:art/generated-art/tarot-cards-bleed/tarot-clay-<card>.{png,jpg}(2:3,kit 产物)
输出:art/generated-art/tarot/cards/<card>-clay.jpg(768 宽, q90, ≤180KB)

与牌背同一套路:满幅出血版把场景铺满四边,牌位实框 aspectFill 后不再露底色/圆角。
用法: python miniapp/art/tarot-cards/install-bleed.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / 'art/generated-art/tarot-cards-bleed'
DST = ROOT / 'art/generated-art/tarot/cards'
WIDTH = 768
QUALITY = 90

CARDS = ['death', 'high-priestess', 'judgement', 'the-devil', 'the-emperor', 'the-fool',
         'the-hanged-man', 'the-hermit', 'the-lovers', 'the-star', 'the-sun', 'the-tower',
         'the-world', 'wheel-of-fortune']


def main() -> None:
    missing = []
    for name in CARDS:
        src = None
        for ext in ('.png', '.jpg'):
            cand = SRC / f'tarot-clay-{name}{ext}'
            if cand.exists():
                src = cand
                break
        if src is None:
            missing.append(name)
            continue
        im = Image.open(src).convert('RGB')
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
        dst = DST / f'{name}-clay.jpg'
        im.save(dst, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
        print('%-20s -> %-30s %dx%d %dKB' % (
            src.name, dst.name, im.width, im.height, dst.stat().st_size // 1024))
    if missing:
        raise SystemExit('missing generated files: ' + ', '.join(missing))


if __name__ == '__main__':
    main()
