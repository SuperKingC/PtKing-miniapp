# -*- coding: utf-8 -*-
"""测测子品牌栏 v9：移除直边外侧的低透明度方形裙边。

v8 已把圆角轮廓收窄到 2-3px 抗锯齿过渡，但最外侧仍有 alpha≈4 的像素沿四条
直边连成一圈。它们叠到米白页面后会读作浅色方形包裹。本脚本只清理从图像边界
连通的低透明度像素（alpha 1..31），保留 alpha>=32 的圆角过渡和画面内部细节。

用法：python fix-banner-edge-v9.py
      python fix-banner-edge-v9.py --in <png> --out <png>
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PREP = os.path.join(HERE, 'prepared')
LOW_ALPHA_MAX = 31


def shift(arr, dy, dx):
    """首两轴 4 邻域平移，越界侧补 False（避免绕图像对边串色）。"""
    h, w = arr.shape[:2]
    out = np.zeros_like(arr)
    ys = slice(max(dy, 0), h + min(dy, 0))
    yd = slice(max(-dy, 0), h + min(-dy, 0))
    xs = slice(max(dx, 0), w + min(dx, 0))
    xd = slice(max(-dx, 0), w + min(-dx, 0))
    out[yd, xd] = arr[ys, xs]
    return out


def boundary_connected_low_alpha(alpha):
    """找出从图像边界连通的 alpha<=31 区域中的半透明像素。"""
    passable = alpha <= LOW_ALPHA_MAX
    connected = np.zeros(alpha.shape, dtype=bool)
    connected[0, :] = passable[0, :]
    connected[-1, :] = passable[-1, :]
    connected[:, 0] |= passable[:, 0]
    connected[:, -1] |= passable[:, -1]
    while True:
        nxt = connected.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nxt |= passable & shift(connected, dy, dx)
        if np.array_equal(nxt, connected):
            break
        connected = nxt
    return connected & (alpha > 0)


def clean(src_path, dst_path):
    image = Image.open(src_path).convert('RGBA')
    arr = np.array(image)
    alpha = arr[..., 3]
    skirt = boundary_connected_low_alpha(alpha)
    if not skirt.any():
        raise SystemExit('no boundary-connected low-alpha skirt found; refusing to guess')

    out = arr.copy()
    out[..., 3][skirt] = 0
    Image.fromarray(out, 'RGBA').save(dst_path)

    h, w = alpha.shape
    print(f'cleared skirt px: {int(skirt.sum())}')
    print('left mid-row profile:', out[h // 2, :12, 3].tolist())
    print('top mid-col profile:', out[:12, w // 2, 3].tolist())
    print(f'saved {dst_path} ({os.path.getsize(dst_path)} bytes)')


if __name__ == '__main__':
    src = os.path.join(PREP, 'me-banner-panel-v8.png')
    dst = os.path.join(PREP, 'me-banner-panel-v9.png')
    if '--in' in sys.argv:
        src = sys.argv[sys.argv.index('--in') + 1]
    if '--out' in sys.argv:
        dst = sys.argv[sys.argv.index('--out') + 1]
    clean(src, dst)
