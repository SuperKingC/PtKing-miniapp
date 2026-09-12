# -*- coding: utf-8 -*-
"""塔罗时光横幅（首页 hero）下缘白条修复。

病根：源图 tarot-panel-v5.jpg 底部约 15px 是一条「奶油面板下缘 → 更浅奶油」的
平缓渐隐带（rowstd 由 ~29 掉到 ~16），在页面上读作「面板底没填满的一段白」。
做法：从「内容行（卡片/云/猫）的实际底界」往上收到面板圆角下缘，裁掉平缓渐隐带，
再把裁切后的底缘按面板本体色补一条 1px 收口，避免硬切露白。产出 tarot-panel-v6.jpg。
"""
import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'src', 'assets', 'illus')
PREP = os.path.join(HERE, 'prepared')
os.makedirs(PREP, exist_ok=True)

# 面板本体底缘（圆角收口处）：实测强内容（卡片/猫/云）底界 y≈483，渐隐带到 499。
# 收在 y=486（含圆角下双像素），向下不再保留渐隐。
CROP_BOTTOM_KEEP = 487


def main():
    im = Image.open(os.path.join(SRC, 'tarot-panel-v5.jpg')).convert('RGB')
    w, h = im.size
    out = im.crop((0, 0, w, CROP_BOTTOM_KEEP))
    # 底缘 1px 收口：用倒数第 3 行的均值色，避免 JPEG 末行偏亮露白
    arr = np.array(out).astype(float)
    body_row = arr[CROP_BOTTOM_KEEP - 4].mean(axis=0)
    arr[-1] = body_row
    out = Image.fromarray(arr.clip(0, 255).astype('uint8'), 'RGB')
    dest = os.path.join(PREP, 'tarot-panel-v6.jpg')
    out.save(dest, quality=90, optimize=True, progressive=True)
    print(f'tarot-panel-v5.jpg ({w}x{h}) -> tarot-panel-v6.jpg ({w}x{CROP_BOTTOM_KEEP}), {os.path.getsize(dest)} bytes')


if __name__ == '__main__':
    main()
