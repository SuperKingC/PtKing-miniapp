"""「我的」页重设计批次预处理：横幅裁 bbox 转面板，图标 floodfill 抠透明 + 200×200 归一。

横幅 me-banner-v3 是白底上的圆角矩形面板（同 tarot-panel 先例）：裁非白 bbox 略内缩，不抠图。
图标白底生图：先降分辨率，再调 kit floodfill 抠透明，裁 alpha 边后归一到 200×200（主体占 94%）。
"""
from pathlib import Path
import subprocess
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parent
PREPARED = ROOT / 'prepared'
FINAL = PREPARED / 'final'
FINAL_OUT = PREPARED / 'final'
FINAL_OUT.mkdir(parents=True, exist_ok=True)
GENERATED = ROOT / 'generated'

ICONS = {
    'icon-me-clear-v5': 200,
    'icon-me-privacy-v5': 200,
    'icon-me-share-v5': 200,
    'icon-me-feedback-v5': 200,
    'icon-me-theme-v5': 200,
    'icon-me-haptics-v5': 200,
}


def latest(name: str) -> Path:
    hits = sorted(GENERATED.glob(f'{name}*.png'))
    if not hits:
        raise SystemExit(f'missing generated asset: {name}')
    return hits[-1]


# 横幅：裁非白 bbox（内缩防白晕）→ 1080 宽 → RGB PNG 交 compress 转 JPEG
banner = Image.open(latest('me-banner-v3'))
gray = banner.convert('L')
mask = gray.point(lambda v: 255 if v < 246 else 0)
bounds = mask.getbbox()
assert bounds, 'banner subject not found'
inset = 6
box = (bounds[0] + inset, bounds[1] + inset, bounds[2] - inset, bounds[3] - inset)
crop = banner.crop(box).convert('RGB')
crop.thumbnail((1080, 1080), Image.Resampling.LANCZOS)
crop.save(PREPARED / 'me-banner-v3.png')
print(f'banner: bounds={bounds} -> {crop.size}')

# 图标：降分辨率 → floodfill → 归一 200×200
for name, side in ICONS.items():
    image = Image.open(latest(name))
    image.thumbnail((400, 400), Image.Resampling.LANCZOS)
    flat = PREPARED / f'{name}.png'
    image.convert('RGB').save(flat)
    subprocess.run([sys.executable, 'D:/Mine/miniapp-kit/matting/floodfill_matting.py', str(flat), str(PREPARED), '--tol', '28', '--no-compare'], check=True)
    result = PREPARED / 'floodfill' / f'{name}_floodfill.png'
    matted = Image.open(result).convert('RGBA')
    alpha = matted.getchannel('A').point(lambda v: 0 if v < 16 else v)
    matted.putalpha(alpha)
    bbox = alpha.getbbox()
    assert bbox, f'{name}: matting empty'
    matted = matted.crop(bbox)
    subject = 188
    scale = min(subject / matted.width, subject / matted.height, 1.0)
    matted = matted.resize((max(1, round(matted.width * scale)), max(1, round(matted.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (side, side))
    canvas.paste(matted, ((side - matted.width) // 2, (side - matted.height) // 2), matted)
    canvas.save(FINAL_OUT / f'{name}.png')
    print(f'{name}: matted {bbox} -> canvas {side}, {matted.size}')
