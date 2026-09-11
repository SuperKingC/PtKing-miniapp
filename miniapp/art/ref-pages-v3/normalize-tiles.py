"""五枚 tile 图标归一：按 alpha bbox 裁出主体 → 居中铺到正方形画幅（主体占 94%）→ 统一尺寸。

修两件事：各 tile 主体占比不一致（MBTI 128x136、love 156x152、fun 主体偏下偏小）、
气球等生成 tile 主体在画幅内偏下。只动 alpha 画幅，不改像素内容。
"""
from pathlib import Path
from PIL import Image

SRC = Path('miniapp/src/assets/illus')
TILES = ['tile-mbti-v3', 'tile-love-v3', 'tile-star-v1', 'tile-career-v2', 'tile-fun-v2']
CANVAS = 200  # 输出统一 200x200，主体占 94%

for name in TILES:
    im = Image.open(SRC / f'{name}.png').convert('RGBA')
    bbox = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    body = im.crop(bbox)
    # 等比缩放：最长边 = CANVAS * 0.94
    scale = (CANVAS * 0.94) / max(body.size)
    body = body.resize((max(1, round(body.width * scale)), max(1, round(body.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(body, ((CANVAS - body.width) // 2, (CANVAS - body.height) // 2), body)
    dest = SRC / f'{name}.png'
    canvas.save(dest)
    print(f'{name}: bbox {bbox[2]-bbox[0]}x{bbox[3]-bbox[1]} -> centered {body.size} on {CANVAS}, {dest.stat().st_size} bytes')
