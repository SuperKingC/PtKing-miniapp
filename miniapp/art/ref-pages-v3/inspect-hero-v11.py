# -*- coding: utf-8 -*-
"""一次性取证：src/assets/illus/hero-card-v11.png 的浅框与锯齿量化定位。

只读不改。输出：
- 四边 alpha/RGB 剖面（RGB 已按页面底 254,250,245 合成，直接对应肉眼所见）
- 浅框判定：0<a<255 像素合成后与页底的色差分布（分边统计）
- 锯齿判定：上/下轮廓 y(x) 的台阶统计（|dy|=1 的 1px 跳变占比）
- 6x 放大检查图落 _edge-preview/
"""
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'src', 'assets', 'illus')
PREV = os.path.join(HERE, '_edge-preview')
os.makedirs(PREV, exist_ok=True)
PAGE = np.array([254.0, 250.0, 245.0])


def composite(arr):
    a = arr[..., 3:4] / 255.0
    return arr[..., :3] * a + PAGE * (1.0 - a)


def main():
    img = Image.open(os.path.join(SRC, 'hero-card-v11.png'))
    print('mode:', img.mode, 'size:', img.size)
    arr = np.array(img.convert('RGBA')).astype(float)
    h, w = arr.shape[:2]
    al = arr[..., 3]
    comp = composite(arr)

    print('\n== 四边剖面 (alpha / 合成RGB) ==')
    mid_y, mid_x = h // 2, w // 2
    print('left  y=%d:' % mid_y, [(int(al[mid_y, x]), tuple(comp[mid_y, x].astype(int))) for x in range(6)])
    print('right y=%d:' % mid_y, [(int(al[mid_y, x]), tuple(comp[mid_y, x].astype(int))) for x in range(w - 6, w)])
    print('top   x=%d:' % mid_x, [(int(al[y, mid_x]), tuple(comp[y, mid_x].astype(int))) for y in range(6)])
    print('bot   x=%d:' % mid_x, [(int(al[y, mid_x]), tuple(comp[y, mid_x].astype(int))) for y in range(h - 6, h)])

    print('\n== 浅框量化：0<a<255 合成后与页底色差 ==')
    aa = (al > 0) & (al < 255)
    diff = np.abs(comp - PAGE).max(axis=2)
    yy, xx = np.mgrid[0:h, 0:w]
    bands = {
        'left(x<8)': xx < 8,
        'right(x>=w-8)': xx >= w - 8,
        'top(y<8)': yy < 8,
        'bottom(y>=h-8)': yy >= h - 8,
        'other(内部AA)': (xx >= 8) & (xx < w - 8) & (yy >= 8) & (yy < h - 8),
    }
    for name, m in bands.items():
        sel = aa & m
        if not sel.any():
            print(f'{name}: 无')
            continue
        d = diff[sel]
        rgbm = comp[sel].mean(axis=0)
        print(f'{name}: n={int(sel.sum())} 合成均值={tuple(rgbm.astype(int))} '
              f'色差p50={np.percentile(d, 50):.0f} p90={np.percentile(d, 90):.0f} max={d.max():.0f}')

    print('\n== 锯齿量化：50% 轮廓台阶 ==')
    thr = al >= 128
    for name, axis in (('top', 0), ('bottom', 1)):
        contour = np.full(w, -1, int)
        rng = range(h) if axis == 0 else range(h - 1, -1, -1)
        for y in rng:
            row = thr[y]
            upd = contour == -1
            contour[upd] = np.where(row, y, contour)[upd]
        valid = contour >= 0
        xs_v = np.where(valid)[0]
        ys_c = contour[xs_v].astype(float)
        d1 = np.abs(np.diff(ys_c))
        stair = (d1 == 1).sum()
        jump = (d1 > 1).sum()
        print(f'{name}: 覆盖列 {len(xs_v)}/{w}  1px台阶={stair}({stair/len(xs_v)*100:.0f}%)  '
              f'跳变(>1px)={jump}  y范围={ys_c.min():.0f}-{ys_c.max():.0f}')

    print('\n== 6x 检查图（页底合成）==')
    im = Image.fromarray(np.round(comp).astype('uint8'), 'RGB')
    crops = {
        'v11-left': (0, mid_y - 60, 26, mid_y + 60),
        'v11-right': (w - 26, mid_y - 60, w, mid_y + 60),
        'v11-tl': (0, 0, 110, 80),
        'v11-tr': (w - 110, 0, w, 80),
        'v11-bottom': (60, h - 40, 480, h),
        'v11-cloud': (w - 220, h - 110, w, h),
    }
    for name, box in crops.items():
        c = im.crop(box)
        c.resize(((box[2] - box[0]) * 6, (box[3] - box[1]) * 6), Image.NEAREST).save(
            os.path.join(PREV, f'{name}.png'))
        print(' ', name, box)


if __name__ == '__main__':
    main()
