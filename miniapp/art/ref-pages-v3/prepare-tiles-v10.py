# -*- coding: utf-8 -*-
"""tile 第三轮（v10）：修用户实发的两个问题——icon 偏小 + 蒙版鬼影框。

根因（高清原稿逐像素测量）：
1. v9 裁切在 tile 周围留 20px 卡底边距且整体不透明，蓝色实体只占画布 ~80%，
   152rpx 渲染后实体仅 ~116rpx（参考稿 ~150rpx）；
2. 不透明裁切把参考稿卡面颗粒一起带进来，落在纯色卡面上显出一圈白框。

v10 做法：洪水填充软抠——从裁切窗四角向内填充「与卡面色距离 <8」的像素为透明，
非填充区按距离 8→18 渐变 alpha（保留软边），tile 实体与接触影不透明烘焙。
画布统一 172x172，实体锚在 (10,8)，1px 画布 ↔ 1rpx 渲染。
career/fun 参考稿没有：同画布合成同款接触影（实测影峰 α≈0.55）。

参考稿几何（2496px 原稿，左页 749px ↔ 750rpx，1px≈1rpx）：
  卡 x92..766 y676..873（h197）；tile 实体 ~154x148 @ 卡内 (22, 26)；
  接触影下延 ~15px 与卡底影带相接。
"""
from PIL import Image, ImageFilter, ImageDraw
import numpy as np
import os
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, '..', '..', 'src', 'assets', 'illus')
REF = os.path.join(HERE, 'reference-ui.png')
CARD = np.array([254, 250, 244], dtype=float)   # 卡面 #fefaf4（实测均值 253.9/250.1/244.2）

CANVAS = 172          # 画布边长（渲染 172rpx）
BODY_X, BODY_Y = 10, 8   # 实体左上角在画布内的锚点
BODY_H = 148            # 目标实体高（参考稿 147-151）

TILES = {
    # name: (实体框 x0,y0,x1,y1)——高清原稿逐行/列扫描实测（含实体边，不含接触影）
    'mbti': (115, 705, 270, 852),
    'love': (114, 924, 270, 1075),
    'star': (115, 1149, 269, 1300),
}
OUT = {
    'mbti': 'tile-mbti-v10.png',
    'love': 'tile-love-v10.png',
    'star': 'tile-star-v10.png',
    'career': 'tile-career-v10.png',
    'fun': 'tile-fun-v10.png',
}
SHADOW_RGB = (174, 153, 124)   # 接触影基色（合成用）


def dist_map(arr):
    return np.sqrt(((arr - CARD) ** 2).sum(axis=2))


def flood_outside(bg):
    """从四边向内填充 bg=True 的连通区（numpy 前沿传播）。"""
    h, w = bg.shape
    outside = np.zeros_like(bg)
    outside[0, :] = bg[0, :]; outside[-1, :] = bg[-1, :]
    outside[:, 0] = bg[:, 0]; outside[:, -1] = bg[:, -1]
    while True:
        grow = outside.copy()
        grow[1:, :] |= outside[:-1, :]
        grow[:-1, :] |= outside[1:, :]
        grow[:, 1:] |= outside[:, :-1]
        grow[:, :-1] |= outside[:, 1:]
        grow &= bg
        if (grow == outside).all():
            return outside
        outside = grow


def matte(arr):
    """软抠：填充区 alpha=0，非填充区按与卡面距离 8→18 渐变，实体全不透明。"""
    dist = dist_map(arr)
    bg = dist < 8.0
    outside = flood_outside(bg)
    alpha = np.clip((dist - 8.0) / 10.0, 0, 1)
    alpha[dist >= 18.0] = 1.0
    alpha[outside] = 0.0
    a_img = Image.fromarray((alpha * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.8))
    return np.asarray(a_img, dtype=float) / 255.0


def detect_body(arr, win, thr=45):
    x0, y0, x1, y1 = win
    d = dist_map(arr[y0:y1, x0:x1])
    ys, xs = np.where(d > thr)
    return int(x0 + xs.min()), int(y0 + ys.min()), int(x0 + xs.max() + 1), int(y0 + ys.max() + 1)


def crop_tile(ref, name, box):
    bx0, by0, bx1, by1 = box
    # 实体锚 (BODY_X, BODY_Y)，裁切画布 CANVAS 见方；接触影随裁切窗带出
    cx0, cy0 = bx0 - BODY_X, by0 - BODY_Y
    crop = ref[cy0:cy0 + CANVAS, cx0:cx0 + CANVAS]
    alpha = matte(crop)
    # 硬性清掉实体框外（左右上 -4px、底部 +28px 接触影带）的残留 alpha——
    # 裁切窗角落贴近卡缘影带时洪水填充到不了，会留下不透明角渣
    bw, bh = bx1 - bx0, by1 - by0
    keep = np.zeros((CANVAS, CANVAS), dtype=bool)
    x0, y0 = max(0, BODY_X - 4), max(0, BODY_Y - 4)
    x1, y1 = min(CANVAS, BODY_X + bw + 4), min(CANVAS, BODY_Y + bh + 28)
    keep[y0:y1, x0:x1] = True
    alpha[~keep] = 0.0
    rgba = np.dstack([crop, alpha * 255]).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(HERE, 'prepared', OUT[name]))
    solid = (alpha * 255 > 200)
    ys, xs = np.where(solid)
    print(f'{name}: body ref ({bx0},{by0})-({bx1},{by1}) w={bx1-bx0} h={by1-by0} -> '
          f'crop@({cx0},{cy0}) solid in-canvas x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()}')


def synth_tile(src_name, out_name):
    """参考稿没有的 tile：透明资产缩放到统一实体高，合成同款接触影。"""
    img = Image.open(os.path.join(SRC_DIR, src_name)).convert('RGBA')
    a = np.asarray(img, dtype=float)
    ys, xs = np.where(a[:, :, 3] > 128)
    body = img.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    bw, bh = body.size
    scale = min(BODY_H / bh, 154 / bw)
    body = body.resize((max(1, round(bw * scale)), max(1, round(bh * scale))), Image.LANCZOS)
    tw, th = body.size
    ox, oy = BODY_X + (154 - tw) // 2, BODY_Y + (BODY_H - th) // 2
    # 接触影：剪影下移 3px、σ4 模糊、α×0.55（原稿影峰 #d2c1ac 反推）、只落在实体外
    alpha = np.asarray(body)[:, :, 3]
    sh = Image.fromarray(alpha.astype(np.uint8), 'L').transform(
        (CANVAS, CANVAS), Image.AFFINE, (1, 0, -ox, 0, 1, -(oy - 3)), Image.BILINEAR)
    sh = sh.filter(ImageFilter.GaussianBlur(4))
    sh_a = (np.asarray(sh, dtype=float) * 0.55).clip(0, 255)
    body_a = Image.new('L', (CANVAS, CANVAS), 0)
    body_a.paste(Image.fromarray(alpha.astype(np.uint8), 'L'), (ox, oy))
    sh_a = np.maximum(sh_a - np.asarray(body_a, dtype=float), 0)
    shadow = np.zeros((CANVAS, CANVAS, 4), dtype=np.uint8)
    shadow[:, :, 0], shadow[:, :, 1], shadow[:, :, 2] = SHADOW_RGB
    shadow[:, :, 3] = sh_a.astype(np.uint8)
    body_full = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    body_full.paste(body, (ox, oy), body)
    canvas = Image.alpha_composite(Image.fromarray(shadow, 'RGBA'), body_full)
    canvas.save(os.path.join(HERE, 'prepared', out_name))
    print(f'{src_name} -> {out_name} (body {tw}x{th} @ ({ox},{oy}), baked contact shadow)')


def main():
    os.makedirs(os.path.join(HERE, 'prepared'), exist_ok=True)
    ref = np.asarray(Image.open(os.path.join(HERE, 'reference-ui.png')).convert('RGB'), dtype=float)
    for name, box in TILES.items():
        crop_tile(ref, name, box)
    synth_tile('tile-career-v4.png', OUT['career'])
    synth_tile('tile-fun-v8.png', OUT['fun'])


if __name__ == '__main__':
    main()
