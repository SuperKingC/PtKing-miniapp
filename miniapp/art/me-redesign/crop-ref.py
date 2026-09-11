"""「我的」页资产直接从选定稿 ui-3_v2.png 裁切（用户拍板：要和参考图完全一样，不重生成）。

横幅：实心圆角面板（含烘焙投影边），按 crop-reference.py 的 tarot-panel 先例不抠图，
直接裁 bbox 转 JPEG 落包，CSS 圆角容器裁切显示。
图标：白/米底上的软陶 tile，裁切后用色键+边框连通域抠透明（同 banner v5 流程），
裁 alpha 边归一到 200×200。
"""
from pathlib import Path
import json

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
REF = Path('D:/Mine/PtKing-miniapp/art/generated-art/me-redesign-ui/ui-3_v2.png')
FINAL = ROOT / 'prepared' / 'final'
FINAL.mkdir(parents=True, exist_ok=True)

image = Image.open(REF).convert('RGB')
print('design:', image.size)

# ---- 横幅面板（精确 bbox 已探明：130,79 - 1511,908，略内缩 2px 防底色晕）----
panel = image.crop((132, 81, 1509, 906))
panel.thumbnail((1080, 1080), Image.Resampling.LANCZOS)
panel.save(ROOT / 'prepared' / 'me-banner-refpanel.png')
print('banner panel:', panel.size, 'ratio:', round(panel.width / panel.height, 3))

# ---- 6 枚图标：裁切 → 色键抠透明 → 归一 200×200 ----
BOXES = json.load(open(ROOT / 'tile-boxes.json'))
SQUARE = 200
SUBJECT = 188
for name, (x0, y0, x1, y1) in BOXES.items():
    crop = image.crop(tuple(int(v) for v in (x0, y0, x1, y1)))
    arr = np.array(crop).astype(np.int16)
    h, w, _ = arr.shape
    # 米白底四角采样 → 边框连通域整体移除（保留 tile 烘焙的软投影）
    corners = [arr[1, 1], arr[1, -2], arr[-2, 1], arr[-2, -2]]
    bg = np.mean(corners, axis=0)
    dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))
    ff = (dist <= 14).astype(np.uint8)
    num, labels = cv2.connectedComponents(ff, connectivity=4)
    border_labels = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    border_labels.discard(0)
    kill = np.isin(labels, list(border_labels))
    alpha = np.where(kill, 0, 255).astype(np.uint8)
    removed = round(100 * float(kill.mean()), 1)
    kernel = np.ones((3, 3), np.uint8)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, kernel)
    rgba = Image.fromarray(np.dstack([np.array(crop), alpha]), 'RGBA')
    bbox = Image.fromarray(alpha).getbbox()
    assert bbox, f'{name}: matting empty'
    rgba = rgba.crop(bbox)
    scale = min(SUBJECT / rgba.width, SUBJECT / rgba.height, 1.0)
    rgba = rgba.resize((max(1, round(rgba.width * scale)), max(1, round(rgba.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (SQUARE, SQUARE))
    canvas.paste(rgba, ((SQUARE - rgba.width) // 2, (SQUARE - rgba.height) // 2), rgba)
    canvas.save(FINAL / f'ref-{name}.png')
    print(f'{name}: removed bg {removed}% -> {canvas.size}, subject {rgba.size}')
