# 一次性：从两套皮肤背景大图裁出牌桌缩略图小图 → src/assets/illus 升版文件名。
# 牌桌预览窗口为 327x220rpx；按最高 3x 屏算 = 490x330 px，超出再大也看不出差别。
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]  # D:/Mine/PtKing-miniapp
SRC = ROOT / 'art' / 'generated-art' / 'tarot' / 'ui'
DEST = ROOT / 'miniapp' / 'src' / 'assets' / 'illus'

OUT_W, OUT_H = 490, 330
RATIO = OUT_W / OUT_H

# 源图 → 展示带（y0 起点，高度按比例算），对准各皮肤主体：classic=月门，clay=猫与桌面
JOBS = [
    ('sanctuary-background.jpg', 'tarot-skin-classic-v1.jpg', 557),
    ('sanctuary-background-clay.jpg', 'tarot-skin-clay-v1.jpg', 150),
]

for src_name, dest_name, y0 in JOBS:
    im = Image.open(SRC / src_name).convert('RGB')
    w, h = im.size
    crop_h = round(w / RATIO)
    if crop_h > h:
        crop_h = h
    y0 = max(0, min(y0, h - crop_h))
    crop = im.crop((0, y0, w, y0 + crop_h)).resize((OUT_W, OUT_H), Image.LANCZOS)
    out = DEST / dest_name
    crop.save(out, 'JPEG', quality=82, optimize=True, progressive=True)
    print(f'{dest_name}: {im.size} crop y{y0}..{y0 + crop_h} -> {OUT_W}x{OUT_H}  {out.stat().st_size // 1024} KB')
