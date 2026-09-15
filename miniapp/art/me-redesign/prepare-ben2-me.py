"""「我的」页横幅+6图标:BEN2 专业抠图重做(v8 批)。

根因修复:
- 横幅 panel-v2.jpg 是矩形直裁,圆角外底色楔形残留+烘焙晕,贴页面有色差暗角 → BEN2 整块抠透明。
- icon v7 是色键硬阈值抠图,反锯齿软边被吃,边缘锯齿/缺失 → BEN2 软 alpha 重抠。
源:选定稿 ui-3_v2.png 直接裁切(与参考图像素同源,不重生成)。
"""
from pathlib import Path
import json
import sys

KIT = Path('D:/Mine/miniapp-kit/matting')
WEIGHTS = KIT / 'BEN2_Base.safetensors'
sys.path.insert(0, str(KIT))

import torch  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
from BEN2 import BEN_Base  # noqa: E402

ROOT = Path(__file__).resolve().parent
REF = Path('D:/Mine/PtKing-miniapp/art/generated-art/me-redesign-ui/ui-3_v2.png')
FINAL = ROOT / 'prepared' / 'final'
CHECK = ROOT / 'prepared'
FINAL.mkdir(parents=True, exist_ok=True)

device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = BEN_Base().to(device).eval()
from safetensors.torch import load_file  # noqa: E402
model.load_state_dict(load_file(str(WEIGHTS)), strict=True)
print(f'BEN2 loaded on {device}')

image = Image.open(REF).convert('RGB')
print('design:', image.size)

def ben2_cut(crop: Image.Image) -> Image.Image:
    rgba = model.inference(crop).convert('RGBA')
    a = np.array(rgba.getchannel('A'))
    a[a < 16] = 0
    rgba.putalpha(Image.fromarray(a))
    return rgba


def pm_resize(im: Image.Image, size: tuple) -> Image.Image:
    """预乘 alpha 的 LANCZOS 缩放。

    BEN2 透明区 RGB=(0,0,0),straight-alpha 直缩会让黑 RGB 渗进半透明边,
    贴白卡显灰黑脏边(me 页 v8 图标即此病,见 clean-icon-fringe.py 取证)。
    """
    arr = np.asarray(im).astype(np.float64) / 255.0
    alpha = arr[:, :, 3]
    prem = arr[:, :, :3] * alpha[:, :, None]
    prem_r = np.asarray(Image.fromarray((prem * 255).round().astype(np.uint8), 'RGB').resize(size, Image.Resampling.LANCZOS)).astype(np.float64) / 255.0
    alpha_r = np.asarray(Image.fromarray((alpha * 255).round().astype(np.uint8), 'L').resize(size, Image.Resampling.LANCZOS)).astype(np.float64) / 255.0
    rgb = np.where(alpha_r[:, :, None] > 1e-3, prem_r / np.maximum(alpha_r, 1e-4)[:, :, None], 0.0).clip(0, 1)
    out = np.dstack([rgb, alpha_r[:, :, None]])
    return Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA')


def defringe_rgb(im: Image.Image, solid: int = 200, rounds: int = 6) -> Image.Image:
    """半透明 fringe 的 RGB 用 solid 区颜色 8 邻域迭代膨胀替换,alpha 不动。"""
    arr = np.array(im.convert('RGBA'))
    rgb = arr[:, :, :3].astype(np.float64)
    a = arr[:, :, 3]
    fringe = (a > 0) & (a < solid)
    filled = a >= solid
    work = rgb.copy()
    for _ in range(rounds):
        todo = fringe & ~filled
        if not todo.any():
            break
        acc = np.zeros_like(work)
        cnt = np.zeros(work.shape[:2])
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                src = np.roll(np.roll(filled, dy, axis=0), dx, axis=1)
                acc += np.roll(np.roll(work, dy, axis=0), dx, axis=1) * src[:, :, None]
                cnt += src
        grow = todo & (cnt > 0)
        work[grow] = acc[grow] / cnt[grow][:, None]
        filled |= grow
    arr[:, :, :3] = work.round().clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')

# ---- 横幅:面板 bbox 外扩 16px(保烘焙投影渐变)→ BEN2 整块抠 ----
# (实测 BEN2 把浅蓝大面板内部当背景误杀成半透明,横幅已改走几何蒙版 prepare-banner-geom.py;
#  保留此段仅为留档,设 SKIP_BANNER=1 跳过)
import os  # noqa: E402
if not os.environ.get('SKIP_BANNER'):
    box = (131 - 16, 79 - 16, 1518 + 16, 906 + 16)
    crop = image.crop(box)
    banner = ben2_cut(crop)
    bbox = banner.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    assert bbox, 'banner BEN2 empty'
    banner = banner.crop(bbox)
    banner.thumbnail((1080, 1080), Image.Resampling.LANCZOS)
    banner.save(FINAL / 'me-banner-v6-ben2.png')
    print(f'banner: crop {box} -> bbox {bbox} -> {banner.size}')

# ---- 6 枚图标:tile-boxes 外扩 8px → BEN2 → 裁 alpha 边 → 归一 200 画幅主体 188 ----
BOXES = json.load(open(ROOT / 'tile-boxes.json'))
SQUARE, SUBJECT = 200, 188
mags = Image.new('RGB', (SQUARE * 6 + 70, SQUARE + 20), (255, 0, 255))
for idx, (name, (x0, y0, x1, y1)) in enumerate(BOXES.items()):
    pad = 8
    crop = image.crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad))
    icon = ben2_cut(crop)
    bb = icon.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    assert bb, f'{name}: BEN2 empty'
    icon = icon.crop(bb)
    # 无 1.0 上限:主体统一放大到 94% 画幅(软陶图 LANCZOS 1.3x 内无损观感),
    # 否则 BEN2 抠到的软影宽度差会让各图标显示大小不一
    # 先去污再预乘缩放:straight-alpha 直缩的黑渗边不再产生
    icon = defringe_rgb(icon)
    scale = min(SUBJECT / icon.width, SUBJECT / icon.height)
    icon = pm_resize(icon, (max(1, round(icon.width * scale)), max(1, round(icon.height * scale))))
    canvas = Image.new('RGBA', (SQUARE, SQUARE), (0, 0, 0, 0))
    canvas.paste(icon, ((SQUARE - icon.width) // 2, (SQUARE - icon.height) // 2), icon)
    canvas.save(FINAL / f'ref-{name}-ben2.png')
    check = Image.new('RGB', (SQUARE, SQUARE), (255, 0, 255))
    check.paste(canvas, (0, 0), canvas)
    mags.paste(check, (10 + idx * (SQUARE + 10), 10))
    print(f'{name}: subject {icon.size} in {SQUARE} canvas')

mags.save(CHECK / '_check_icons_ben2.png')

if not os.environ.get('SKIP_BANNER'):
    # 横幅检查图:贴品红底看边缘
    chk = Image.new('RGB', (banner.width, banner.height), (255, 0, 255))
    chk.paste(banner, (0, 0), banner)
    chk.thumbnail((1000, 1000), Image.LANCZOS)
    chk.save(CHECK / '_check_banner_ben2.png')
print('check images saved')
