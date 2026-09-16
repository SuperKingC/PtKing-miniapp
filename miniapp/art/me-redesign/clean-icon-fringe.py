"""BEN2 图标产物暗边修复:fringe 黑渗色去污 + 熨平设计稿烘焙深边。

两个叠加来源(取证见 _scratch_edge_diag.py 与 ref 剖面比对):
1. 渗色:BEN2 透明区 RGB=(0,0,0),straight-alpha LANCZOS resize 让黑 RGB
   渗进半透明 fringe(a<200),贴白卡显灰晕;
2. 烘焙深边:设计稿 ui-3_v2 的牌体外缘自带 ~10px 暗边渐变(最外 2px
   亮度 86% → 内渐 99%),在参考稿奶油底上是自然体积,贴 app 白卡就是
   用户指的「浅浅的黑线」。项目惯例:列表图标影一律 CSS,资产不带烘焙影。

做法(不改 alpha 形状,只修颜色):距轮廓外(a==0)BAND px 内、a>0 的整条
边缘带,RGB 用 interior 颜色 8 邻域迭代膨胀替换;小物件(星/月尖)全落在
带内时按 DEPTHS 逐级退浅色源补填。随后预乘 alpha LANCZOS 缩到 128px。
产物 ref-*-defringe.png 供 compress-v9.mjs 同名覆盖包内 icon-me-*-v8.png。
注:本脚本是存量产物的一次性修复;prepare-ben2-me.py 已改预乘 resize,
未来 BEN2 重跑不再有渗色,烘焙深边若再出现可重跑本脚本熨平。
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
FINAL = ROOT / 'prepared' / 'final'
SOLID = 200          # interior 判定:alpha>=200 且带外,作为颜色源
BAND = 16            # 边缘带宽度:中段(物件接触影邻接)深边渐变到 d≈15 才回 99%
DEPTHS = (16, 12, 8, 5, 3)  # 逐级退浅的色源深度:小物件(星/月尖)全落在带内时兜底
DILATE_ROUNDS = 20   # 8 邻域迭代膨胀,含沿边缘带绕过尖角的传播
TARGET = 128         # 与 d18fa54 包内尺寸一致(84rpx@3x≈131px,够用)


def dilate(mask: np.ndarray, rounds: int) -> np.ndarray:
    out = mask.copy()
    for _ in range(rounds):
        d = out.copy()
        d[1:, :] |= out[:-1, :]
        d[:-1, :] |= out[1:, :]
        d[:, 1:] |= out[:, :-1]
        d[:, :-1] |= out[:, 1:]
        out = d
    return out


def recolor_edge_band(arr: np.ndarray) -> np.ndarray:
    """边缘带(fringe+烘焙深边)RGB 用 interior 颜色迭代膨胀替换,alpha 不动。"""
    a = arr[:, :, 3]
    outside = a == 0
    band = dilate(outside, BAND) & (a > 0)
    if not band.any():
        return arr
    rgb = arr[:, :, :3].astype(np.float64)
    work = rgb.copy()
    filled = np.zeros_like(band)
    for depth in DEPTHS:
        source = (a >= SOLID) & ~dilate(outside, depth)
        filled |= source
        for _ in range(DILATE_ROUNDS):
            todo = band & ~filled
            if not todo.any():
                break
            acc = np.zeros_like(work)
            cnt = np.zeros(work.shape[:2])
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dy == 0 and dx == 0:
                        continue
                    src = np.roll(np.roll(filled, dy, axis=0), dx, axis=1)
                    acc += np.roll(np.roll(work, dy, axis=0), dx, axis=1) * src[:, :, None]
                    cnt += src
            grow = todo & (cnt > 0)
            work[grow] = acc[grow] / cnt[grow][:, None]
            filled |= grow
        if not (band & ~filled).any():
            break
    left = int((band & ~filled).sum())
    if left:
        print(f'  warn: {left} band px unfilled, kept original RGB')
    out = arr.copy()
    out[:, :, :3] = work.round().clip(0, 255).astype(np.uint8)
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
    a = arr[:, :, 3]
    band = dilate(a == 0, BAND) & (a > 0)
    interior = (a >= SOLID) & ~band
    before = arr[:, :, :3][band].mean(axis=0).round(1) if band.any() else None
    ref = arr[:, :, :3][interior].mean(axis=0).round(1) if interior.any() else None
    cleaned = recolor_edge_band(arr)
    after = cleaned[:, :, :3][band].mean(axis=0).round(1) if band.any() else None
    icon = pm_resize(Image.fromarray(cleaned), TARGET)
    out = FINAL / path.name.replace('-ben2.png', '-defringe.png')
    icon.save(out)
    print(f'{path.name}: band RGB {before} -> {after} (interior {ref}), saved {out.name}')
print('done')
