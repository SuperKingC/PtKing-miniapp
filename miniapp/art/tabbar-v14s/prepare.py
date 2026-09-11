"""tabbar v14s 正式资产落地(2026-09-11,用户选定 v12-A 极简素净):
白底 2K 生成图 → BEN2 显著性抠透明(奶白猫身与白底同色,floodfill tol=42 会把额头
高光抠穿;BEN2 按主体整块抠,边缘软过渡,见 ref-pages-v3/prepare-ben2.py 同款路子)
→ 按统一 bbox 长边归一到 162px 画布 → 落 prepared/。
之后 compress-tabbar-v14s.mjs 走 TinyPNG(PNG8)升名落包。

用户硬要求:8 枚图片大小与主体占比一致 → 全部用同一 bbox 长边基准(140/162),
每枚等比缩放到该基准再居中,视觉大小严格一致。
"""
from pathlib import Path
import sys

from PIL import Image

KIT = Path('D:/Mine/miniapp-kit/matting')
WEIGHTS = KIT / 'BEN2_Base.safetensors'
sys.path.insert(0, str(KIT))

import torch  # noqa: E402
from BEN2 import BEN_Base  # noqa: E402

ROOT = Path(__file__).resolve().parent
GENERATED = ROOT / 'generated'
PREPARED = ROOT / 'prepared'
PREPARED.mkdir(exist_ok=True)
BEN2_OUT = PREPARED / 'ben2'
BEN2_OUT.mkdir(exist_ok=True)

NAMES = [
    'icon-tab-test-v14s',
    'icon-tab-test-active-v14s',
    'icon-tab-tarot-v14s',
    'icon-tab-tarot-active-v14s',
    'icon-tab-records-v14s',
    'icon-tab-records-active-v14s',
    'icon-tab-me-v14s',
    'icon-tab-me-active-v14s',
]

CANVAS = 162
# 主体在 162 画布上的统一外接框长边:对齐现役 v11s 的 75%-90% 观感,取 140。
# 8 枚全部缩放到 bbox 最长边 = 140,再居中;宽高比保持原图。
TARGET_LONG_EDGE = 140

def latest(name: str) -> Path:
    hits = sorted(GENERATED.glob(f'{name}.png')) + sorted(GENERATED.glob(f'{name}.jpg'))
    if not hits:
        raise SystemExit(f'missing generated: {name}')
    return hits[-1]

def main() -> None:
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = BEN_Base().to(device).eval()
    from safetensors.torch import load_file
    model.load_state_dict(load_file(str(WEIGHTS)), strict=True)
    print(f'BEN2 loaded on {device}')

    # 1) BEN2 抠透明(2K 原图直抠,不预缩)
    matted = {}
    for name in NAMES:
        src = latest(name)
        image = Image.open(src).convert('RGB')
        result = model.inference(image)
        result = result.convert('RGBA')
        dest = BEN2_OUT / f'{name}.png'
        result.save(dest)
        matted[name] = result
        print(f'{name}: ben2 matted {result.size}')

    # 2) 统一占比归一:裁 alpha bbox,等比缩放到统一长边,居中 162 画布
    for name, img in matted.items():
        bbox = img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        if bbox is None:
            raise SystemExit(f'{name}: empty alpha')
        bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
        long_edge = max(bw, bh)
        scale = TARGET_LONG_EDGE / long_edge
        cropped = img.crop(bbox)
        new_size = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
        resized = cropped.resize(new_size, Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.paste(resized, ((CANVAS - new_size[0]) // 2, (CANVAS - new_size[1]) // 2), resized)
        dest = PREPARED / f'{name}.png'
        canvas.save(dest)
        print(f'{name}: normalized bbox {bw}x{bh} -> {new_size[0]}x{new_size[1]} on {CANVAS} canvas')

if __name__ == '__main__':
    main()

if __name__ == '__main__':
    main()
