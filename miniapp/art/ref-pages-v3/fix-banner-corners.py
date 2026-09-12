# -*- coding: utf-8 -*-
"""测测子品牌栏圆角修复（2026-09-12 二次）。

病根：上一轮 fix-asset-edges-final.py 的 fix_banner 用了 radius_ratio=0.19
（429*0.19≈81px），比品牌栏画面本体的真实圆角（实测约 40px，与 CSS 40rpx
折算的 ~43px 一致）大了一倍。蒙版在圆角处切掉一大块画面本体，页面底色从
角部透出来，读作「外面透明的圆角没填满」。

本轮只改半径，其余参数（内缩去外圈浅色页带、羽化）与上一轮保持一致：
  radius_ratio 0.19 -> 0.10（43px，对齐画面本体弧 + CSS 圆角）
产出 prepared/me-banner-panel-v6.png。
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'src', 'assets', 'illus')
PREP = os.path.join(HERE, 'prepared')
os.makedirs(PREP, exist_ok=True)

INSET = 5
FEATHER = 1.2
RADIUS_RATIO = 0.10  # 429px 高 -> 43px（上一轮 0.19 -> 81px 为病根）


def main():
    im = Image.open(os.path.join(SRC, 'me-banner-panel-v4.png')).convert('RGBA')
    w, h = im.size
    radius = int(round(h * RADIUS_RATIO))
    ss = 4
    mask = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (INSET * ss, INSET * ss, w * ss - 1 - INSET * ss, h * ss - 1 - INSET * ss),
        radius=max(2, radius - INSET) * ss, fill=255,
    )
    mask = mask.resize((w, h), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(FEATHER))

    arr = np.array(im)
    arr[..., 3] = np.minimum(arr[..., 3], np.array(mask))
    out = Image.fromarray(arr, 'RGBA')
    out.save(os.path.join(PREP, 'me-banner-panel-v6.png'))

    print(f'me-banner-panel-v6.png {out.size} inset={INSET} radius={radius} feather={FEATHER}')
    a = np.array(out)[..., 3]
    print(f'  alpha TL={a[0, 0]} mid-left={a[h // 2, 0]} mid-top={a[0, w // 2]} mid-right={a[h // 2, w - 1]}')
    print(f'  mid-row first opaque x={int(np.argmax(a[h // 2] > 0))}')


if __name__ == '__main__':
    main()
