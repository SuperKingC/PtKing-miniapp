"""新生 tile 批次（正视居中版）落地：BEN2 抠图（保留 tile 自带内外影）→ 裁边 → 200 画幅居中。

fun-v5 是 JPG 白底，先转 RGB 再抠。输出直接进 src/assets/illus 升版文件名。
"""
from pathlib import Path
import subprocess
import sys

KIT = Path('D:/Mine/miniapp-kit/matting')
WEIGHTS = Path('D:/Mine/miniapp-kit/matting/BEN2_Base.safetensors')
sys.path.insert(0, str(KIT))

import torch  # noqa: E402
from PIL import Image  # noqa: E402
from BEN2 import BEN_Base  # noqa: E402
from safetensors.torch import load_file  # noqa: E402

ROOT = Path(__file__).resolve().parent
GEN = ROOT / 'generated'
PREP = ROOT / 'prepared' / 'tiles2'
PREP.mkdir(parents=True, exist_ok=True)
SRC = ROOT.parents[1] / 'src/assets/illus'

JOBS = {
    'tile-star-v3.png': ('tile-star-v5.png', 200),
    'tile-love-v4.png': ('tile-love-v5.png', 200),
    'tile-mbti-v5.png': ('tile-mbti-v6.png', 200),
    'tile-fun-v5.jpg': ('tile-fun-v6.png', 200),
}

device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = BEN_Base().to(device).eval()
model.load_state_dict(load_file(str(WEIGHTS)), strict=True)
print(f'BEN2 on {device}')

for gen_name, (dest_name, size) in JOBS.items():
    im = Image.open(GEN / gen_name).convert('RGB')
    alpha = model.inference(im)
    b = alpha.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    body = alpha.crop(b)
    scale = size * 0.94 / max(body.size)
    body = body.resize((max(1, round(body.width * scale)), max(1, round(body.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(body, ((size - body.width) // 2, (size - body.height) // 2), body)
    prepared = PREP / dest_name
    canvas.save(prepared)
    subprocess.run([sys.executable, str(KIT.parent / 'matting' / 'floodfill_matting.py')], check=False) if False else None
    print(f'{gen_name} -> {dest_name}: {canvas.size}, {prepared.stat().st_size} bytes (待压缩)')
