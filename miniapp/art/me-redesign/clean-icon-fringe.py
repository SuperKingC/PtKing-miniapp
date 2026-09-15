"""BEN2 图标产物暗边去污:straight-alpha resize 的黑 RGB 渗色修复。

根因:BEN2 输出透明区 RGB=(0,0,0),prepare/clean 两段的 LANCZOS resize 走
straight-alpha(RGB 与 A 各自独立插值),透明邻点的黑 RGB 按权重混进半透明边
像素,而 alpha 通道单独插值不匹配 → 边缘 1-3px 的半透明像素 straight RGB 发暗
(实测 fringe 均值 ~(60-94)),贴白卡合成显灰黑脏边,drop-shadow 再投影更脏。

做法(不改 alpha 形状,只修颜色):
1. 颜色去污:a<SOLID 的像素 RGB 用 8 邻域迭代膨胀从 solid 区向外延展替换
   (fringe 宽 <=3px,迭代 6 轮足够),alpha 原样保留;
2. 预乘 resize:RGB*A 预乘后与 A 一起 LANCZOS 缩到 128px,再反预乘,
   杜绝缩放再次渗黑;
3. 产物 ref-*-defringe.png 供 compress-v9.mjs 同名覆盖包内 icon-me-*-v8.png。
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
FINAL = ROOT / 'prepared' / 'final'
SOLID = 200          # alpha>=200 视为实色,作为颜色源
DILATE_ROUNDS = 6    # fringe <=3px,6 轮 8 邻域膨胀足够覆盖
TARGET = 128         # 与 d18fa54 包内尺寸一致(84rpx@3x≈131px,够用)


def defringe_rgb(arr: np.ndarray) -> np.ndarray:
    """半透明 fringe 的 RGB 用 solid 区颜色迭代膨胀替换,alpha 不动。"""
    rgb = arr[:, :, :3].astype(np.float64)
    a = arr[:, :, 3]
    solid = a >= SOLID
    fringe = (a > 0) & ~solid
    if not fringe.any():
        return arr
    work = rgb.copy()
    filled = solid.copy()
    for _ in range(DILATE_ROUNDS):
        todo = fringe & ~filled
        if not todo.any():
            break
        acc = np.zeros_like(work)
        cnt = np.zeros((work.shape[0], work.shape[1]))
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                src = np.roll(np.roll(filled, dy, axis=0), dx, axis=1)
                val = np.roll(np.roll(work, dy, axis=0), dx, axis=1)
                acc += val * src[:, :, None]
                cnt += src
        grow = todo & (cnt > 0)
        work[grow] = acc[grow] / cnt[grow][:, None]
        filled |= grow
    out = arr.copy()
    out[:, :, :3] = work.round().clip(0, 255).astype(np.uint8)
    left = int((fringe & ~filled).sum())
    if left:
        print(f'  warn: {left} fringe px unfilled, kept original RGB')
    return out


def pm_resize(im: Image.Image, size: int) -> Image.Image:
    """预乘 alpha 的 LANCZOS 缩放,避免透明区黑 RGB 渗进软边。"""
    arr = np.asarray(im).astype(np.float64) / 255.0
    alpha = arr[:, :, 3]
    prem = arr[:, :, :3] * alpha[:, :, None]
    prem_img = Image.fromarray((prem * 255).round().astype(np.uint8), 'RGB')
    alpha_img = Image.fromarray((alpha * 255).round().astype(np.uint8), 'L')
    prem_r = np.asarray(prem_img.resize((size, size), Image.Resampling.LANCZOS)).astype(np.float64) / 255.0
    alpha_r = np.asarray(alpha_img.resize((size, size), Image.Resampling.LANCZOS)).astype(np.float64) / 255.0
    safe = np.maximum(alpha_r, 1e-4)[:, :, None]
    rgb = np.where(alpha_r[:, :, None] > 1e-3, prem_r / safe, 0.0).clip(0, 1)
    out = np.dstack([rgb, alpha_r[:, :, None]])
    return Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA')


for path in sorted(FINAL.glob('ref-*-ben2.png')):
    arr = np.array(Image.open(path).convert('RGBA'))
    fringe = (arr[:, :, 3] > 0) & (arr[:, :, 3] < SOLID)
    before = arr[:, :, :3][fringe].mean(axis=0).round(1) if fringe.any() else None
    cleaned = defringe_rgb(arr)
    after = cleaned[:, :, :3][fringe].mean(axis=0).round(1) if fringe.any() else None
    icon = pm_resize(Image.fromarray(cleaned), TARGET)
    out = FINAL / path.name.replace('-ben2.png', '-defringe.png')
    icon.save(out)
    print(f'{path.name}: fringe RGB {before} -> {after}, saved {out.name} {icon.size}')
print('done')
