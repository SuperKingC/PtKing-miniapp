"""BEN2 图标产物杂散 alpha 清理:只保留主体最大连通域,再重新归一。

BEN2 在主体四角留下少量半透明残点(haptics 顶缘 211px 条带、theme/clear
1-7px),落到包里会在白卡上显示为脏点。做法:alpha>8 做四连通域标记,
保留最大域,其余 alpha 清零;随后按主体 bbox 重新裁切并归一到
200 画幅主体 188(与 prepare-ben2-me.py 的归一规则一致)。
"""
from pathlib import Path
from collections import deque

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
FINAL = ROOT / 'prepared' / 'final'
SQUARE, SUBJECT = 200, 188
MIN_ALPHA = 8


def largest_component(mask: np.ndarray) -> np.ndarray:
    """四连通域 BFS,返回只含最大域的布尔掩码。"""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    sizes = [0]
    for y0, x0 in zip(*np.where(mask)):
        if labels[y0, x0]:
            continue
        label = len(sizes)
        queue = deque([(y0, x0)])
        labels[y0, x0] = label
        size = 0
        while queue:
            y, x = queue.popleft()
            size += 1
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = label
                    queue.append((ny, nx))
        sizes.append(size)
    biggest = int(np.argmax(sizes[1:])) + 1
    return labels == biggest


for path in sorted(FINAL.glob('ref-*-ben2.png')):
    im = Image.open(path).convert('RGBA')
    arr = np.array(im)
    alpha = arr[:, :, 3]
    keep = largest_component(alpha > MIN_ALPHA)
    cleaned = arr.copy()
    outside = ~keep
    # 杂散点清零,但保留主体域周围 1px 的软边(用闭运算太重,直接对 alpha<=8
    # 且不与主体域相邻的像素清零;简化:alpha>8 的杂散域清零 + alpha<=8 且
    # 与杂散域相邻的微值一并清零——用一次膨胀判定相邻)
    stray = outside & (alpha > 0)
    if stray.any():
        # 杂散域的 1px 膨胀范围内低 alpha 也清掉,避免孤点晕边
        dil = stray.copy()
        dil[1:, :] |= stray[:-1, :]
        dil[:-1, :] |= stray[1:, :]
        dil[:, 1:] |= stray[:, :-1]
        dil[:, :-1] |= stray[:, 1:]
        killed = int((cleaned[:, :, 3][dil] > 0).sum())
        cleaned[:, :, 3][dil] = 0
        print(f'{path.name}: stray pixels cleared (alpha>0 touched: {killed})')
    else:
        print(f'{path.name}: clean already')

    # 重新归一:按清理后的主体 bbox 裁切并缩放居中
    a = cleaned[:, :, 3]
    bb = Image.fromarray(a).point(lambda v: 255 if v > 2 else 0).getbbox()
    assert bb, f'{path.name}: empty after clean'
    icon = Image.fromarray(cleaned).crop(bb)
    scale = min(SUBJECT / icon.width, SUBJECT / icon.height)
    icon = icon.resize(
        (max(1, round(icon.width * scale)), max(1, round(icon.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new('RGBA', (SQUARE, SQUARE), (0, 0, 0, 0))
    canvas.paste(icon, ((SQUARE - icon.width) // 2, (SQUARE - icon.height) // 2), icon)
    canvas.save(path)

    check = Image.new('RGB', (SQUARE, SQUARE), (255, 255, 255))
    check.paste(canvas, (0, 0), canvas)
    print(f'  -> subject {icon.size}, re-normalized in {SQUARE} canvas')
print('done')
