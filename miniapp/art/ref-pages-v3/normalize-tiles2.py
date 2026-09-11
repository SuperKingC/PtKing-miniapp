"""按 tile 本体（非 alpha bbox，避免把软投影算进主体）归一四枚 tile：
本体最长边铺到画幅 96%，居中，落到 200x200。fun 本体偏小问题一次修正。
"""
from pathlib import Path
from PIL import Image

SRC = Path('miniapp/src/assets/illus')
TILES = {
    'tile-star-v6.png': 'blue',
    'tile-love-v6.png': 'peach',
    'tile-mbti-v7.png': 'blue',
    'tile-fun-v7.png': 'peach',
}
SIZE = 200


def body_bbox(im, kind):
    xs, ys = [], []
    if kind == 'blue':
        cond = lambda p: p[2] > p[0] + 10 and p[2] > 170 and p[3] > 200
    else:
        cond = lambda p: p[0] > 200 and 140 < p[1] < 215 and 90 < p[2] < 190 and p[3] > 200
    for y in range(im.height):
        for x in range(im.width):
            if cond(im.getpixel((x, y))):
                xs.append(x); ys.append(y)
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


for name, kind in TILES.items():
    im = Image.open(SRC / name).convert('RGBA')
    b = body_bbox(im, kind)
    body = im.crop(b)
    # 本体（含其烘焙的下缘小投影）铺到 96% 画幅
    scale = SIZE * 0.96 / max(body.size)
    body = body.resize((max(1, round(body.width * scale)), max(1, round(body.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(body, ((SIZE - body.width) // 2, (SIZE - body.height) // 2), body)
    canvas.save(SRC / name)
    print(f'{name}: body {b[2]-b[0]}x{b[3]-b[1]} -> {body.size} on {SIZE}')
