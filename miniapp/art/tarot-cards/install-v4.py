#!/usr/bin/env python
"""把 v4 满幅牌面落到 COS 热更目录：768 宽 JPEG q90，覆盖同名 -clay.jpg。"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / 'art/generated-art/tarot-cards-v4'
DST = ROOT / 'art/generated-art/tarot/cards'
WIDTH = 768
QUALITY = 90
MAX_KB = 180
CARDS = [
    'the-fool', 'the-magician', 'high-priestess', 'the-empress', 'the-emperor',
    'the-hierophant', 'the-lovers', 'the-chariot', 'strength', 'the-hermit',
    'wheel-of-fortune', 'justice', 'the-hanged-man', 'death', 'temperance',
    'the-devil', 'the-tower', 'the-star', 'the-moon', 'the-sun', 'judgement',
    'the-world',
]


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)
    missing = []
    for name in CARDS:
        src = next((SRC / f'{name}{ext}' for ext in ('.png', '.jpg', '.jpeg') if (SRC / f'{name}{ext}').exists()), None)
        if src is None:
            missing.append(name)
            continue
        im = Image.open(src).convert('RGB')
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
        dst = DST / f'{name}-clay.jpg'
        quality = QUALITY
        im.save(dst, 'JPEG', quality=quality, optimize=True, progressive=True)
        while dst.stat().st_size > MAX_KB * 1024 and quality > 76:
            quality -= 4
            im.save(dst, 'JPEG', quality=quality, optimize=True, progressive=True)
        kb = dst.stat().st_size / 1024
        flag = 'OK' if kb <= MAX_KB else '超红线'
        print(f'{src.name:<28} -> {dst.name:<28} {im.size[0]}x{im.size[1]} {kb:.0f}KB q{quality} {flag}')
        if kb > MAX_KB:
            raise RuntimeError(f'{dst} exceeds {MAX_KB}KB')
    if missing:
        raise SystemExit('missing generated files: ' + ', '.join(missing))


if __name__ == '__main__':
    main()
