#!/usr/bin/env python
"""塔罗 clay 牌背 v3 落位(2026-09-14)。

v2 中央是立体浮雕八角星，图里还带一层投影。用户要求去掉阴影、
不要立体星星。v3a 改为满幅扁平印刷菱格 + 平面八角罗盘星。
本脚本把它等比降到 768 宽并编码 JPEG。

用法: python miniapp/art/tarot-cardback/prepare-cardback.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / 'art/generated-art/tarot-cardback-v3/tarot-clay-cardback-v3a.jpg'
DST = ROOT / 'art/generated-art/tarot/ui/card-back-clay-v3.jpg'
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
    flag = 'OK' if size_kb <= MAX_KB else '超红线'
    print(f'{SRC.name} -> {DST.relative_to(ROOT)} {im.size[0]}x{im.size[1]} {size_kb:.0f}KB q{QUALITY} {flag}')
    if size_kb > MAX_KB:
        raise RuntimeError(f'{DST} exceeds {MAX_KB}KB')


if __name__ == '__main__':
    main()
