# -*- coding: utf-8 -*-
"""测测子品牌栏外圈「暖白匀边」修复（2026-09-12）。

病根（用户反馈「我的页里面的测测子也有一样的问题，没切干净」）：
品牌栏边缘是 4x 超采样几何圆角蒙版出来的多级 alpha 渐隐（5/28/88/167/226…）。
蒙版只改 alpha、不动 RGB，所以外圈裙边带的是**源图该处的颜色**——顶部/右侧面板
蓝区附近还好，但源图裁切边界那几行是参考稿的页面暖色；更关键的是 **TinyPNG 的
有损量化**：最外圈 alpha≈5 的像素原本有 83 种颜色（面板蓝/奶油/暖灰混杂），压缩
后被折叠成**单一常量 (229,225,216)**。于是品牌栏四周贴着一圈低饱和暖色、面板本体
却是冷蓝，读作「边缘没切干净」的一圈暖白软边。

实测：出货图外圈暖度（R-B）顶部 +9~+13、左 +12~+16、右 +8~+14，而面板本体只有
+1 ~ -7。

做法：把「非不透明」裙边像素的 RGB 换成**最近的不透明本体色**（4 邻域外扩），
alpha 一概不动。这样外圈携带的就是面板/云的本体色，量化后也不会再冒出第三种暖灰。

用法：python fix-banner-edge-v7.py            # prepared/me-banner-panel-v6.png -> prepared/me-banner-panel-v7.png
      python fix-banner-edge-v7.py --in <png> --out <png>
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PREP = os.path.join(HERE, 'prepared')

BODY_MIN_ALPHA = 250   # 视为「本体」的 alpha 下限
BLEED_ITERS = 40       # 本体色外扩的最大距离（px）


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
            sk = np.roll(known, (dy, dx), axis=(0, 1))
            so = np.roll(out, (dy, dx), axis=(0, 1))
            hit = (~known) & sk & (~nxt)
            take[hit] = so[hit]
            nxt = nxt | hit
        out, known = take, nxt
    return out


def repair(src_path, dst_path):
    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img).astype(float)
    rgb = arr[..., :3].copy()
    alpha = arr[..., 3]

    body = alpha >= BODY_MIN_ALPHA
    if not body.any():
        raise SystemExit('no opaque body pixels found; refusing to guess')
    skirt = (alpha > 0) & (~body)

    source = nearest_body(rgb, body)
    before = np.abs(rgb[skirt] - source[skirt]).max(axis=1).mean()
    rgb[skirt] = source[skirt]
    after = np.abs(rgb[skirt] - source[skirt]).max(axis=1).mean()

    out = arr.copy()
    out[..., :3] = rgb
    res = Image.fromarray(out.astype('uint8'), 'RGBA')
    res.save(dst_path)

    print(f'skirt px recolored: {int(skirt.sum())}')
    print(f'deviation from nearest body: {before:.1f} -> {after:.1f}')
    print(f'alpha untouched: {np.array_equal(alpha, np.array(img)[..., 3])}')
    print(f'saved {dst_path} ({os.path.getsize(dst_path)} bytes)')


if __name__ == '__main__':
    src = os.path.join(PREP, 'me-banner-panel-v6.png')
    dst = os.path.join(PREP, 'me-banner-panel-v7.png')
    if '--in' in sys.argv:
        src = sys.argv[sys.argv.index('--in') + 1]
    if '--out' in sys.argv:
        dst = sys.argv[sys.argv.index('--out') + 1]
    repair(src, dst)
