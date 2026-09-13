# -*- coding: utf-8 -*-
"""测测子品牌栏 v8：收掉 7px 晕带（「浅色方形包裹」）+ 重建 2px 抗锯齿圆角。

病根（2026-09-13 用户反馈「测测子栏边缘有锯齿，周围还被一个浅色方形包裹」）：
v7 只把裙边 RGB 换成最近本体色，alpha 一概没动——而 v6 传下来的 alpha 是一条
**7-8px 宽的羽化坡**（中行左缘 0/0/5/29/88/167/226/250/255）。外圈 alpha 5~29
的低透明带铺满矩形四周，RGB 是面板边缘的暖灰，合成为页面底后读作一圈「浅色
方框」；TinyPNG 再把 alpha 量化到 26 级，坡上出现色阶，圆角发毛（锯齿）。

做法（50% 等高线重建）：把 v7 的 alpha 4x 超采样，取 50% 等值线为「真实轮廓」
——高斯模糊不改阶跃沿的 50% 线，几何圆角半径与位置都保持不变；在 4x 空间对
二值轮廓做小半径高斯（3.0@4x ≈ 0.75px@1x）再 LANCZOS 缩回，得到 2-3px 的干净
多级过渡。轮廓外侧的旧裙边（晕带）全部由新坡接管，RGB 用最近本体色回填；
轮廓内侧像素一概不动；本体（alpha>=250）统一提到 255。

用法：python fix-banner-edge-v8.py   # prepared/me-banner-panel-v7.png -> prepared/me-banner-panel-v8.png
      python fix-banner-edge-v8.py --in <png> --out <png>
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
PREP = os.path.join(HERE, 'prepared')

SS = 4                # 超采样倍率
BLUR_AT_SS = 3.0      # 4x 空间高斯半径（≈0.75px@1x，过渡带 2-3px）
BODY_MIN_ALPHA = 250  # 视为「本体」的 alpha 下限
CONTOUR_THR = 128     # 50% 等值线
BLEED_ITERS = 40      # 本体色外扩的最大距离（px）


def shift(arr, dy, dx):
    """首两轴 4 邻域平移，越界侧补 False/0（不用 np.roll，避免绕图像对边串色）。"""
    H, W = arr.shape[:2]
    out = np.zeros_like(arr)
    ys = slice(max(dy, 0), H + min(dy, 0))
    yd = slice(max(-dy, 0), H + min(-dy, 0))
    xs = slice(max(dx, 0), W + min(dx, 0))
    xd = slice(max(-dx, 0), W + min(-dx, 0))
    out[yd, xd] = arr[ys, xs]
    return out


def flood_outside(alpha, thr=CONTOUR_THR):
    """从图像边界洪泛 alpha<thr 的外部区域（等值线外侧，含旧晕带）。"""
    core = alpha >= thr
    outside = np.zeros(alpha.shape, bool)
    outside[0, :] = ~core[0, :]
    outside[-1, :] = ~core[-1, :]
    outside[:, 0] = ~core[:, 0]
    outside[:, -1] = ~core[:, -1]
    while True:
        nxt = outside.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nxt |= (~core) & shift(outside, dy, dx)
        if (nxt == outside).all():
            return outside
        outside = nxt


def nearest_body(rgb, seed, iters=BLEED_ITERS):
    """把 seed 区颜色按 4 邻域逐层外扩，供裙边像素取最近本体色（纯 numpy）。"""
    out = rgb.copy()
    known = seed.copy()
    for _ in range(iters):
        if known.all():
            break
        nxt = known.copy()
        take = out.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sk = shift(known, dy, dx).astype(bool)
            so = shift(out, dy, dx)
            hit = (~known) & sk & (~nxt)
            take[hit] = so[hit]
            nxt = nxt | hit
        out, known = take, nxt
    return out


def rebuild(src_path, dst_path):
    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img).astype(float)
    H, W = arr.shape[:2]
    old_al = arr[..., 3]

    outside = flood_outside(old_al)

    # 4x 空间重建轮廓过渡：LANCZOS 上采样（平滑，不引入新台阶）→ 50% 二值 →
    # 小半径高斯 → LANCZOS 缩回，得到跟随真实轮廓的 2-3px 多级坡。
    up = Image.fromarray(old_al.astype('uint8'), 'L').resize(
        (W * SS, H * SS), Image.Resampling.LANCZOS
    )
    bin4 = (np.array(up) >= CONTOUR_THR * 255 / 255).astype('uint8') * 255
    bin4 = Image.fromarray(bin4, 'L').filter(ImageFilter.GaussianBlur(BLUR_AT_SS))
    ramp = np.array(bin4.resize((W, H), Image.Resampling.LANCZOS), dtype=float)
    ramp = np.clip(ramp, 0, 255)

    core_old = old_al >= BODY_MIN_ALPHA
    new_al = np.where(outside, ramp, old_al)
    new_al = np.where(core_old, 255.0, new_al)

    # 轮廓外拿到新 alpha 的像素：RGB 换最近本体色（旧裙边带的是参考稿暖灰）。
    rgb = arr[..., :3]
    need = outside & (new_al > 0) & (~core_old)
    if need.any():
        body_color = nearest_body(rgb, core_old)
        rgb = np.where(need[..., None], body_color, rgb)

    out = arr.copy()
    out[..., :3] = rgb
    out[..., 3] = new_al
    res = Image.fromarray(out.astype('uint8'), 'RGBA')
    res.save(dst_path)

    print(f'outside px: {int(outside.sum())}, recolored: {int(need.sum())}')
    print(f'alpha levels: {len(np.unique(new_al.astype("uint8")))}')
    h2 = H // 2
    print('left mid-row new profile:', list(new_al[h2, :12].astype(int)))
    print('top mid-col new profile:', list(new_al[:12, W // 2].astype(int)))
    print(f'saved {dst_path} ({os.path.getsize(dst_path)} bytes)')


if __name__ == '__main__':
    src = os.path.join(PREP, 'me-banner-panel-v7.png')
    dst = os.path.join(PREP, 'me-banner-panel-v8.png')
    if '--in' in sys.argv:
        src = sys.argv[sys.argv.index('--in') + 1]
    if '--out' in sys.argv:
        dst = sys.argv[sys.argv.index('--out') + 1]
    rebuild(src, dst)

    # 合成页面底色的四角放大检查图
    res = Image.open(dst)
    cream = Image.new('RGBA', res.size, (254, 250, 245, 255))
    cream.alpha_composite(res)
    rgb = cream.convert('RGB')
    w, h = res.size
    for name, box in {
        '_banner8_tl': (0, 0, 90, 70),
        '_banner8_tr': (w - 90, 0, w, 70),
        '_banner8_bl': (0, h - 70, 90, h),
        '_banner8_br': (w - 90, h - 70, w, h),
    }.items():
        c = rgb.crop(box)
        c = c.resize(((box[2] - box[0]) * 6, (box[3] - box[1]) * 6), Image.NEAREST)
        c.save(os.path.join(HERE, f'{name}.png'))
    print('previews written')
