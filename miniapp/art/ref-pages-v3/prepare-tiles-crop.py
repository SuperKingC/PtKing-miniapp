# -*- coding: utf-8 -*-
"""tile 对齐参考稿第二轮：直接从高清 reference-ui.png 几何裁切。

背景：上一轮全局 LUT 把 v8 资产中段拉白（#d6d7ca，原稿同位 #bfc8ca），且资产
内部光影结构与原稿不同。参考稿里存在的三枚 tile（MBTI/heart/star）改为直接
裁切：保留原稿全部光影（含烘焙接触影），圆角矩形 alpha 蒙版去卡底。

career/fun 参考稿没有：用现有 v4/v8 资产缩放到同尺寸，合成同款接触影，
保证五枚一套（CSS 统一 filter:none，影都在图里）。
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import os

HERE = os.path.dirname(os.path.abspath(__file__))           # miniapp/art/ref-pages-v3
ART = os.path.dirname(HERE)                                  # miniapp/art
SRC_DIR = os.path.join(os.path.dirname(ART), 'src', 'assets', 'illus')
REF = os.path.join(HERE, 'reference-ui.png')

CARD = (254, 250, 244)          # 原稿卡面/页面同色 #fefaf4
SHADOW_RGB = (174, 153, 124)    # 由原稿接触影最深 #e2d8ca 反推的影色（α≈0.35 on 卡面）

# 参考 tile：彩色 bbox 自动检测窗口 + 裁切窗口（x 侧边 4px，上 4px，下到卡底影带之前）
TILES = {
    # name: (window x0,y0,x1,y1, pad_bottom)  窗口避开右侧标题文字与卡底影带
    # pad_bottom ≈ 接触影带厚度（原稿约 20-26px @2496）
    'mbti': dict(win=(60, 685, 284, 872), pad_bottom=26),
    'love': dict(win=(60, 900, 285, 1096), pad_bottom=26),
    'star': dict(win=(60, 1135, 285, 1322), pad_bottom=26),
}
OUT = {
    'mbti': 'tile-mbti-v9.png',
    'love': 'tile-love-v8.png',
    'star': 'tile-star-v8.png',
    'career': 'tile-career-v5.png',
    'fun': 'tile-fun-v9.png',
}


def detect_bbox(arr, win, sat_thr=14, bright_max=212):
    """tile 主体比卡底影带暗（body ≈#bfc8ca 亮 200 vs 影 ≈#e2d8ca 216），用亮度上界分开。"""
    x0, y0, x1, y1 = win
    a = arr[y0:y1, x0:x1]
    sat = a.max(axis=2) - a.min(axis=2)
    bright = a.mean(axis=2)
    colored = (sat > sat_thr) & (bright < bright_max)
    ys, xs = np.where(colored)
    return x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1


def rounded_mask(size, box, radius, feather=1.5):
    w, h = size
    m = Image.new('L', size, 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle(box, radius=radius, fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather))


def crop_from_ref(arr, name, win, pad_bottom, out_name):
    bx0, by0, bx1, by1 = detect_bbox(arr, win)
    # 裁切边距 20px：tile 周围环境软影约 18px 处衰减完，蒙版边界必须落在与
    # 卡面同色区，否则缩放后显出一圈鬼影框（4px 边距实测翻车）
    cx0, cy0, cx1 = bx0 - 20, by0 - 20, bx1 + 20
    cy1 = by1 + pad_bottom
    crop = arr[cy0:cy1, cx0:cx1]
    h, w = crop.shape[:2]
    canvas = Image.new('RGBA', (200, 200), (0, 0, 0, 0))
    tile = Image.fromarray(crop.astype(np.uint8), 'RGB').convert('RGBA')
    mask = rounded_mask((w, h), (0, 0, w - 1, h - 1), radius=44, feather=2.5)
    tile.putalpha(mask)
    scale = min(200 / w, 200 / h, 1.0)
    if scale < 1.0:
        tile = tile.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        w, h = tile.size
    px, py = (200 - w) // 2, (200 - h) // 2
    canvas.paste(tile, (px, py), tile)
    canvas.save(os.path.join(SRC_DIR, out_name))
    print(f'{name}: bbox {bx0},{by0},{bx1},{by1} crop {w}x{h} -> {out_name}')


def bake_shadow(src_name, out_name):
    """参考稿没有的 tile：现有透明资产缩放到与参考 tile 同占幅，合成同款接触影。"""
    img = Image.open(os.path.join(SRC_DIR, src_name)).convert('RGBA')
    a = np.asarray(img, dtype=float)
    ys, xs = np.where(a[:, :, 3] > 8)
    body = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    bw, bh = body.size
    scale = 178 / max(bw, bh)
    body = body.resize((max(1, round(bw * scale)), max(1, round(bh * scale))), Image.LANCZOS)
    tw, th = body.size
    canvas = Image.new('RGBA', (200, 200), (0, 0, 0, 0))
    ox, oy = (200 - tw) // 2, (200 - th) // 2
    # 合成接触影：剪影下移 4px、σ5 模糊、α×0.4、暖褐
    alpha = np.asarray(body)[:, :, 3]
    sh = Image.fromarray(alpha.astype(np.uint8), 'L').transform(
        (200, 200), Image.AFFINE, (1, 0, -(ox), 0, 1, -(oy - 4)), Image.BILINEAR)
    sh = sh.filter(ImageFilter.GaussianBlur(5))
    sh_a = (np.asarray(sh, dtype=float) * 0.42).clip(0, 255)
    tile_a = Image.new('L', (200, 200), 0)
    tile_a.paste(Image.fromarray(alpha.astype(np.uint8), 'L'), (ox, oy, ox + tw, oy + th))
    sh_a = np.maximum(sh_a - np.asarray(tile_a, dtype=float), 0)  # 影只落在 tile 外
    shadow = np.zeros((200, 200, 4), dtype=np.uint8)
    shadow[:, :, 0], shadow[:, :, 1], shadow[:, :, 2] = SHADOW_RGB
    shadow[:, :, 3] = sh_a.astype(np.uint8)
    body_full = Image.new('RGBA', (200, 200), (0, 0, 0, 0))
    body_full.paste(body, (ox, oy), body)
    canvas = Image.alpha_composite(Image.fromarray(shadow, 'RGBA'), body_full)
    canvas.save(os.path.join(SRC_DIR, out_name))
    print(f'{src_name} -> {out_name} (content {tw}x{th}, baked contact shadow)')


def main():
    ref = np.asarray(Image.open(REF).convert('RGB'), dtype=float)
    crop_from_ref(ref, 'mbti', TILES['mbti']['win'], TILES['mbti']['pad_bottom'], OUT['mbti'])
    crop_from_ref(arr=ref, name='love', win=TILES['love']['win'], pad_bottom=TILES['love']['pad_bottom'], out_name=OUT['love'])
    crop_from_ref(ref, 'star', TILES['star']['win'], TILES['star']['pad_bottom'], OUT['star'])
    bake_shadow('tile-career-v4.png', OUT['career'])
    bake_shadow('tile-fun-v8.png', OUT['fun'])


if __name__ == '__main__':
    main()
