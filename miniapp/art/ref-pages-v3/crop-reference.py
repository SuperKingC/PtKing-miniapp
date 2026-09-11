"""从用户参考图(reference-ui.png 2496x1664)直接裁切各物件 → BEN2 抠透明 → 裁 alpha 边 → 降分辨率。

塔罗整块横幅(含烘焙标题)是矩形面板，不抠图直接转 JPEG。
坐标基于三等分探针图目测，crop 后立刻出预览人工核对。
"""
from pathlib import Path
import sys

KIT = Path('D:/Mine/miniapp-kit/matting')
WEIGHTS = Path('D:/Mine/miniapp-kit/matting/BEN2_Base.safetensors')
sys.path.insert(0, str(KIT))

import torch  # noqa: E402
from PIL import Image  # noqa: E402
from BEN2 import BEN_Base  # noqa: E402

ROOT = Path(__file__).resolve().parent
REF = ROOT / 'reference-ui.png'
OUT = ROOT / 'prepared' / 'refcrop'
OUT.mkdir(parents=True, exist_ok=True)

# name → (crop box in 原图坐标, 最长边, 抠图)
# 左屏 offset x=0；中屏 x=832；右屏 x=1664
JOBS = {
    'hero-card-v1': ((96, 202, 776, 540), 740, True),
    'tile-mbti-v3': ((1745, 690, 1900, 845), 240, True),
    'tile-love-v3': ((110, 920, 278, 1100), 240, True),
    'tile-star-v1': ((110, 1135, 280, 1315), 240, True),
    'tarot-panel-v1': ((872, 54, 1628, 756), 1080, False),
    'tarot-card-single-v3': ((1070, 1098, 1190, 1275), 300, True),
    'tarot-cards-fan-v3': ((1320, 1140, 1545, 1300), 380, True),
    'records-book-v4': ((2030, 130, 2440, 470), 480, True),
}

image = Image.open(ROOT / 'reference-ui.png')
print('reference:', image.size)

device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = BEN_Base().to(device).eval()
from safetensors.torch import load_file  # noqa: E402
model.load_state_dict(load_file(str(WEIGHTS)), strict=True)
print(f'BEN2 loaded on {device}')


def latest_crop_dest(name: str) -> Path:
    return OUT / f'{name}.png'


for name, (box, max_side, matte) in JOBS.items():
    crop = image.crop(box)
    if matte:
        alpha = model.inference(crop)
        bounds = alpha.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        if bounds:
            alpha = alpha.crop(bounds)
        alpha.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        dest = latest_crop_dest(name)
        alpha.save(dest)
    else:
        crop.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        dest = latest_crop_dest(name)
        crop.convert('RGB').save(dest)
    print(f'{name}: {crop.size} -> {alpha.size if matte else crop.size}, {dest.stat().st_size} bytes')
