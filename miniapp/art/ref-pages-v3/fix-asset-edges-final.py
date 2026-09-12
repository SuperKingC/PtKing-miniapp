# -*- coding: utf-8 -*-
"""用户四项视觉修复的最终产物（2026-09-12）。

产物写 prepared/，再由 compress-final.mjs 走 TinyPNG 落 src/assets/illus 并升版：
  tile-fun-v12.png       -> tile-fun-v13.png     气球图标硬阶梯 alpha -> 几何抗锯齿圆角
  tile-career-v12.png    -> tile-career-v13.png  公文包同上
  me-banner-panel-v4.png -> me-banner-panel-v5.png  品牌栏蒙版内缩去外圈浅色页带+硬角
  hero-card-v7.png       -> hero-card-v8.png     今日推荐卡：底缘拉直 + 文字灰影清理
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'src', 'assets', 'illus')
PREP = os.path.join(HERE, 'prepared')
os.makedirs(PREP, exist_ok=True)


# ---------- 1. tile：几何抗锯齿圆角 ----------
def bleed_ring_rgb(arr, body_thr=200):
    """仅把「紧贴本体的一圈」半透明像素的 RGB 换成本体色。

    原始 matting 在边缘留下暗色半透明像素（alpha 1..150、RGB 近黑），合成后
    成黑边。只覆盖 1-2px 近邻，不动更外圈的烘焙接触影（那圈本来就是暗棕投影色）。"""
    rgb = arr[..., :3].copy()
    al = arr[..., 3]
    body = al >= body_thr
    ring = np.zeros_like(body)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ring |= np.roll(body, (dy, dx), axis=(0, 1))
    ring &= ~body
    ring2 = np.zeros_like(body)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ring2 |= np.roll(ring, (dy, dx), axis=(0, 1))
    target = ring | (ring2 & ~body)
    src = np.roll(rgb, (1, 0), axis=(0, 1)).astype(float) * 0
    acc = np.zeros_like(rgb, dtype=float)
    cnt = np.zeros(al.shape, dtype=float)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        sk = np.roll(body, (dy, dx), axis=(0, 1))
        sr = np.roll(rgb, (dy, dx), axis=(0, 1))
        acc[sk] += sr[sk].astype(float)
        cnt[sk] += 1
    have = target & (cnt > 0)
    rgb[have] = (acc[have] / cnt[have, None]).clip(0, 255).astype('uint8')
    arr[..., :3] = rgb
    return arr


def repair_dark_fringe(arr, body_thr=200, dark_thr=90, iters=14):
    """把残留的暗色半透明像素（matting 遗留 RGB≈黑）用最近的本体色填掉。

    只填「alpha>0 且 RGB 近黑」的像素，向本体色迭代扩散；接触影是暖棕不是黑，
    不会被误填。"""
    rgb = arr[..., :3].copy()
    al = arr[..., 3]
    body = al >= body_thr
    dark = (al > 0) & (rgb.max(axis=2) < dark_thr) & ~body
    if not dark.any():
        return arr
    known = body.copy()
    fill = rgb.astype(float).copy()
    acc = rgb.astype(float).copy()
    cnt = np.zeros(al.shape, dtype=float)
    acc[body] = rgb[body].astype(float)
    cnt[body] = 1.0
    for _ in range(iters):
        want = dark & ~known
        if not want.any():
            break
        a2 = np.zeros_like(acc); c2 = np.zeros_like(cnt)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sk = np.roll(known, (dy, dx), axis=(0, 1))
            sa = np.roll(acc, (dy, dx), axis=(0, 1))
            sc = np.roll(cnt, (dy, dx), axis=(0, 1))
            a2[sk] += sa[sk]; c2[sk] += sc[sk]
        have = want & (c2 > 0)
        fill[have] = (a2[have] / c2[have, None]).clip(0, 255)
        acc[have] = fill[have]; cnt[have] = 1.0
        known |= have
    rgb[dark & known] = fill[dark & known].astype('uint8')
    arr[..., :3] = rgb
    return arr


def fix_tile(name, out_name, blur_r=1.0, body_thr=200, erode_iters=2):
    """平滑 alpha 通道：本体 alpha 归一到 255，高斯模糊把 0→255 跳变摊成 2-3px 渐变，
    再取「本体腐蚀 2px 的内部」锁 255——内部 crisp，只有外 1-2px 是软过渡。
    RGB 一律不动（避免补色在阴影/透明区引入灰边或光晕）。"""
    im = Image.open(os.path.join(SRC, name)).convert('RGBA')
    arr = np.array(im).astype(float)
    al = arr[..., 3]
    body = al >= body_thr
    ref = np.median(al[body]) if body.any() else 255.0
    al2 = np.clip(al * (255.0 / max(ref, 1.0)), 0, 255)
    blurred = np.array(
        Image.fromarray(al2.astype('uint8'), 'L').filter(ImageFilter.GaussianBlur(blur_r)),
        dtype=float,
    )
    # 腐蚀本体：把边缘 2px 让给模糊过渡，内部锁实心
    interior = body.copy()
    for _ in range(erode_iters):
        shrink = np.ones_like(interior)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            shrink &= np.roll(interior, (dy, dx), axis=(0, 1))
        interior = shrink
    final = np.maximum(blurred, np.where(interior, 255.0, 0.0))
    arr[..., 3] = final.clip(0, 255)
    res = Image.fromarray(arr.clip(0, 255).astype('uint8'), 'RGBA')
    res.save(os.path.join(PREP, out_name))
    step0 = int(np.abs(np.diff(al.astype(int), axis=1)).max())
    step1 = int(np.abs(np.diff(final.astype(int), axis=1)).max())
    print(f'{name} -> {out_name} (edge step {step0} -> {step1})')
    return res


# ---------- 2. banner：蒙版内缩去外圈页带 ----------
def fix_banner(src_name, out_name, inset=5, feather=1.2, radius_ratio=0.19):
    im = Image.open(os.path.join(SRC, src_name)).convert('RGBA')
    w, h = im.size
    radius = int(round(h * radius_ratio))
    ss = 4
    mask = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (inset * ss, inset * ss, w * ss - 1 - inset * ss, h * ss - 1 - inset * ss),
        radius=max(2, radius - inset) * ss, fill=255,
    )
    mask = mask.resize((w, h), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(feather))
    arr = np.array(im)
    arr[..., 3] = np.minimum(arr[..., 3], np.array(mask))
    res = Image.fromarray(arr, 'RGBA')
    res.save(os.path.join(PREP, out_name))
    print(f'{src_name} -> {out_name} (inset {inset}, feather {feather})')
    return res


# ---------- 3. hero：底缘拉直 + 文字灰影清理 ----------
def _deshadow_text(arr, box, blend=0.75):
    """文字区去烘焙灰影：白字自带一层灰色投影，页面上读作「字上有灰、看着脏」。

    做法：以「各通道大窗最大值」估计文字周边亮背景色（只会取到周围蓝底/亮面，不会
    取到字本身的灰影），把明显暗于该背景且低饱和的像素按 blend 混回背景色。大窗最大
    值不被单像素噪点带走，也不引入模糊灰晕或斑点。"""
    x0, y0, x1, y1 = box
    sub = arr[y0:y1, x0:x1, :3].astype(float)
    lum = sub.mean(axis=2)
    sat = sub.max(axis=2) - sub.min(axis=2)
    glyph = (lum > 200) & (sat < 50)
    bg = np.stack([
        np.array(Image.fromarray(sub[..., c].astype('uint8'), 'L').filter(ImageFilter.MaxFilter(21)), dtype=float)
        for c in range(3)
    ], axis=2)
    shadow = ((bg.mean(axis=2) - lum) > 8) & ~glyph
    if not shadow.any():
        return 0
    sub[shadow] = bg[shadow] * blend + sub[shadow] * (1.0 - blend)
    arr[y0:y1, x0:x1, :3] = sub.clip(0, 255)
    return int(shadow.sum())


def fix_hero(src_name, out_name):
    im = Image.open(os.path.join(SRC, src_name)).convert('RGBA')
    arr = np.array(im)
    al = arr[..., 3].astype(int)
    H, W = al.shape
    solid = al >= 200
    bottoms = np.array([np.where(solid[:, x])[0].max() if solid[:, x].any() else -1 for x in range(W)])
    valid = bottoms[bottoms > 0]
    edge = int(np.percentile(valid, 55))
    out = al.copy()
    for x in range(W):
        if bottoms[x] < 0:
            continue
        out[edge, x] = 255
        out[edge + 1, x] = min(255, int(al[edge + 1, x] * 0.7)) if edge + 1 < H and al[edge + 1, x] > 0 else 0
        out[edge + 2:, x] = 0
    smoothed = np.array(Image.fromarray(out.astype('uint8'), 'L').filter(ImageFilter.GaussianBlur(0.5))).astype(int)
    smoothed[solid] = 255
    arr[..., 3] = smoothed.clip(0, 255).astype('uint8')
    cleaned = _deshadow_text(arr, (30, 40, 330, 145))
    res = Image.fromarray(arr, 'RGBA')
    res.save(os.path.join(PREP, out_name))
    print(f'{src_name} -> {out_name} (bottom y={edge}, deshadow px {cleaned})')
    return res


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if cmd in ('tiles', 'all'):
        fix_tile('tile-fun-v12.png', 'tile-fun-v13.png')
        fix_tile('tile-career-v12.png', 'tile-career-v13.png')
    if cmd in ('banner', 'all'):
        fix_banner('me-banner-panel-v4.png', 'me-banner-panel-v5.png')
    if cmd in ('hero', 'all'):
        fix_hero('hero-card-v7.png', 'hero-card-v8.png')
