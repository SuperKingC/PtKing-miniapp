#!/usr/bin/env python
"""把底栏坐姿猫贴到燕麦底，供牌面 --ref 锁测测子长相（无字、无黑底）。"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / 'miniapp/src/assets/tabbar/icon-tab-me-v18s.png'
DST = ROOT / 'art/generated-art/tarot-cards-v4/_ref-cecezi.png'
BG = (247, 244, 238, 255)


def main() -> None:
    cat = Image.open(SRC).convert('RGBA')
    canvas = Image.new('RGBA', cat.size, BG)
    canvas.alpha_composite(cat)
    DST.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert('RGB').save(DST, 'PNG')
    print(f'{SRC.name} -> {DST.relative_to(ROOT)} {canvas.size[0]}x{canvas.size[1]}')


if __name__ == '__main__':
    main()
