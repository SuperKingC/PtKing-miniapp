"""横幅 me-banner-v3 抠透明：白底上圆角面板+溢出边缘的云月，BEN2 整体抠透明（同 crop-reference.py 先例）。"""
from pathlib import Path
import sys

KIT = Path('D:/Mine/miniapp-kit/matting')
WEIGHTS = KIT / 'BEN2_Base.safetensors'
sys.path.insert(0, str(KIT))

import torch  # noqa: E402
from PIL import Image  # noqa: E402
from BEN2 import BEN_Base  # noqa: E402

ROOT = Path(__file__).resolve().parent

hits = sorted((ROOT / 'generated').glob('me-banner-v3*.png'))
assert hits, 'banner not generated'
image = Image.open(hits[-1])
gray = image.convert('L')
mask = gray.point(lambda v: 255 if v < 246 else 0)
bounds = mask.getbbox()
assert bounds, 'banner subject not found'
margin = 12
box = (max(0, bounds[0] - margin), max(0, bounds[1] - margin), min(image.width, bounds[2] + margin), min(image.height, bounds[3] - margin))
crop = image.crop(box)
print('banner crop:', box, crop.size)

device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = BEN_Base().to(device).eval()
from safetensors.torch import load_file  # noqa: E402
model.load_state_dict(load_file(str(WEIGHTS)), strict=True)
print(f'BEN2 loaded on {device}')

alpha = model.inference(crop)
alpha = alpha.point(lambda v: 0 if v < 16 else v)
bbox = alpha.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
assert bbox, 'BEN2 output empty'
alpha = alpha.crop(bbox)
alpha.thumbnail((1080, 1080), Image.Resampling.LANCZOS)
canvas = Image.new('RGBA', (alpha.width + 16, alpha.height + 16))
canvas.paste(alpha, (8, 8), alpha)
dest = ROOT / 'prepared' / 'final' / 'me-banner-v3.png'
canvas.save(dest)
print(f'banner: alpha bbox={bbox} -> {canvas.size}, {dest.stat().st_size} bytes')
