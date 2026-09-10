"""参考图批次资产落地：抠透明(floodfill) → 按用途降分辨率 → 交给 compress.mjs 压缩落包。

塔罗大横幅 tarot-hero-v2 是自带背景的矩形插画面板，不抠图，转 JPG 落包。
其余白底主体图先 floodfill 抠成透明 PNG。
"""
from pathlib import Path
import subprocess
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parent
TARGET = ROOT.parents[1] / 'src/assets/illus'
PREPARED = ROOT / 'prepared'
PREPARED.mkdir(exist_ok=True)
TARGET.mkdir(parents=True, exist_ok=True)

# name → (最长边, 抠图)
JOBS = {
    'test-hero-clay-v1': (480, True),
    'tile-mbti-v1': (240, True),
    'tile-personality-v1': (240, True),
    'tile-love-v1': (240, True),
    'tile-career-v1': (240, True),
    'tile-fun-v1': (240, True),
    'icon-bell-v1': (160, True),
    'tarot-hero-v2': (1080, False),
    'tarot-card-single-v1': (300, True),
    'tarot-cards-fan-v1': (380, True),
    'records-book-v2': (480, True),
}


def latest_generated(name: str) -> Path:
    hits = sorted((ROOT / 'generated').glob(f'{name}*.png')) + sorted((ROOT / 'generated').glob(f'{name}*.jpg'))
    if not hits:
        raise SystemExit(f'missing generated asset: {name}')
    return hits[-1]


for name, (max_side, matte) in JOBS.items():
    source_path = latest_generated(name)
    image = Image.open(source_path)
    image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    if matte:
        flat = image.convert('RGB')
        source = PREPARED / f'{name}.png'
        flat.save(source)
        subprocess.run([sys.executable, 'D:/Mine/miniapp-kit/matting/floodfill_matting.py', str(source), str(PREPARED), '--tol', '28', '--no-compare'], check=True)
        result = PREPARED / 'floodfill' / f'{name}_floodfill.png'
        with Image.open(result) as check:
            print(f'{name}: matted {check.size}, {result.stat().st_size} bytes')
    else:
        dest = PREPARED / f'{name}.png'
        image.convert('RGB').save(dest)
        print(f'{name}: panel {image.size}, {dest.stat().st_size} bytes')
