"""BEN2 模型抠图 → 裁 alpha 边界 → 按用途降分辨率 → prepared/ben2/。

替代 floodfill：猫云朵这类奶白主体内部有大片与背景同色的封闭区，
泛洪抠不干净；BEN2 显著性分割按主体整块抠，边缘软过渡。
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
OUT = ROOT / 'prepared' / 'ben2'
OUT.mkdir(parents=True, exist_ok=True)

# name → 最长边；tile* 方块图标裁边后铺满、bell 小图、hero/书中图、卡牌小图
JOBS = {
    'test-hero-clay-v1': 480,
    'tile-mbti-v1': 240,
    'tile-personality-v1': 240,
    'tile-love-v1': 240,
    'tile-career-v1': 240,
    'tile-fun-v1': 240,
    'icon-bell-v1': 160,
    'tarot-card-single-v1': 300,
    'tarot-cards-fan-v1': 380,
    'records-book-v2': 480,
}


def latest_generated(name: str) -> Path:
    hits = sorted((ROOT / 'generated').glob(f'{name}*.png')) + sorted((ROOT / 'generated').glob(f'{name}*.jpg'))
    if not hits:
        raise SystemExit(f'missing generated asset: {name}')
    return hits[-1]


device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = BEN_Base().to(device).eval()
from safetensors.torch import load_file
model.load_state_dict(load_file(str(WEIGHTS)), strict=True)
print(f'BEN2 loaded on {device}')

for name, max_side in JOBS.items():
    source = latest_generated(name)
    image = Image.open(source).convert('RGB')
    alpha = model.inference(image)
    # 裁掉全透明边界，让主体铺满画幅（修“视觉尺寸偏小”）
    bounds = alpha.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if bounds:
        alpha = alpha.crop(bounds)
    alpha.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    dest = OUT / f'{name}.png'
    alpha.save(dest)
    print(f'{name}: {alpha.size}, {dest.stat().st_size} bytes')
