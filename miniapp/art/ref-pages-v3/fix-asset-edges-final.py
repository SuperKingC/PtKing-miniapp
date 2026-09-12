# -*- coding: utf-8 -*-
"""用户视觉修复的最终产物（2026-09-12，第二轮：修首轮引入的回归）。

产物写 prepared/，再由 compress-edges-v13.mjs 走 TinyPNG 落 src/assets/illus 并升版：
  tile-fun-v12.png       -> tile-fun-v13.png     气球图标边缘锯齿（RGB 补色后平滑 alpha，杜绝黑边）
  tile-career-v12.png    -> tile-career-v13.png  公文包同上
  me-banner-panel-v4.png -> me-banner-panel-v5.png  品牌栏蒙版内缩去外圈浅色页带+硬角
  hero-card-v7.png       -> hero-card-v8.png     今日推荐卡：只做文字灰影收紧，不动底缘

首轮两个回归及根因（本轮已修）：
1. tile：直接对 alpha 通道做高斯，模糊把 alpha 抹进「透明且 RGB=0」的像素，
   合成后成一圈黑边（俗称黑晕）。修法=先把实体色扩散进 alpha==0 的像素（补色/
   color bleed），再平滑 alpha——半透明边缘就带上本体色，不再是黑。
2. hero：把底缘「拉直」= 对所有列强制 alpha=255 到同一行，反而造出一条硬线，
   还裁掉了原本参差的真实内容。修法=底缘一律不动（v7 已是上一轮清理过的干净硬边），
   只对文字灰影做更保守的处理。
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'src', 'assets', 'illus')
PREP = os.path.join(HERE, 'prepared')
os.makedirs(PREP, exist_ok=True)


# ---------- 1. tile：几何 AA 圆角 + 边缘带本体色（无黑边） ----------

def _fit_radius(body):
    """在 body 掩膜上拟合圆角半径：最小化几何圆角矩形与 body 的差集。"""
    ys, xs = np.where(body)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    H, W = body.shape
    best = None
    for r in range(2, 80):
        m = Image.new('L', (W * 4, H * 4), 0)
        ImageDraw.Draw(m).rounded_rectangle(
            (x0 * 4, y0 * 4, (x1 + 1) * 4 - 1, (y1 + 1) * 4 - 1), radius=r * 4, fill=255
        )
        mm = np.array(m.resize((W, H), Image.Resampling.LANCZOS)) > 128
        diff = int((mm ^ body).sum())
        if best is None or diff < best[1]:
            best = (r, diff, (x0, y0, x1, y1))
    return best


def _near_mask(mask, n):
    """mask 的 n 邻域环（不含 mask 自身）。"""
    grow = mask.copy()
    for _ in range(n):
        g = grow.copy()
        g[1:, :] |= grow[:-1, :]
        g[:-1, :] |= grow[1:, :]
        g[:, 1:] |= grow[:, :-1]
        g[:, :-1] |= grow[:, 1:]
        grow = g
    return grow & ~mask


def _bleed_from(rgb, seed, iters=200):
    """把 seed 区颜色迭代扩散到全图（不改 alpha），供边缘像素取用。"""
    out = rgb.astype(float).copy()
    known = seed.copy()
    for _ in range(iters):
        if known.all():
            break
        acc = np.zeros_like(out)
        cnt = np.zeros(known.shape, dtype=float)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sk = np.roll(known, (dy, dx), axis=(0, 1))
            so = np.roll(out, (dy, dx), axis=(0, 1))
            acc[sk] += so[sk]
            cnt[sk] += 1
        have = (~known) & (cnt > 0)
        out[have] = acc[have] / cnt[have, None]
        known = known | have
    return out


def fix_tile(name, out_name, feather=1.0, body_thr=200, ring_span=3):
    """tile 边缘修复（对齐参考稿 star-v10）。

    参考稿的 AA 边是「本体色 → 页面白」的浅色过渡；而 fun/career 原稿的 AA 环
    RGB 是深色（matting 遗留），合成后成暗锯齿边。

    做法：
    1. 对 body 拟合几何圆角矩形，4x 超采样出干净 AA 的 alpha（`geo`）；
    2. 超出 body 一定距离的烘焙接触影原样保留（`far` 区不覆盖 alpha）；
    3. 边缘带（body 外 ring_span 内的 AA 环）RGB 换成 body 色，并按 (1-alpha)
       向页面白混合——即参考稿那种浅色过渡；
    4. 更外圈的阴影像素保持原 RGB/alpha。"""
    im = Image.open(os.path.join(SRC, name)).convert('RGBA')
    arr = np.array(im).astype(float)
    al = arr[..., 3]
    rgb = arr[..., :3]
    body = al >= body_thr
    r, _, (x0, y0, x1, y1) = _fit_radius(body)
    k = body.shape[0] * 4
    m = Image.new('L', (body.shape[1] * 4, body.shape[0] * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle(
        (x0 * 4, y0 * 4, (x1 + 1) * 4 - 1, (y1 + 1) * 4 - 1), radius=r * 4, fill=255
    )
    geo = np.array(m.resize((body.shape[1], body.shape[0]), Image.Resampling.LANCZOS), dtype=float)
    if feather > 0:
        geo = np.array(
            Image.fromarray(geo.astype('uint8'), 'L').filter(ImageFilter.GaussianBlur(feather)),
            dtype=float,
        )
    # 保留区：离 body 较远的像素（烘焙接触影），不被几何蒙版覆盖
    far = _near_mask(_near_mask(body, ring_span), 10) & (al > 0)
    keep_mask = _near_mask(body, ring_span + 10) & (al > 0)  # 环形范围外的全部保留
    new_alpha = np.where(keep_mask, al, np.maximum(geo, np.where(body, 255.0, 0.0)))

    # 边缘带 RGB：取最近 body 色，按 (1-alpha) 向页面白混合——即参考稿那种浅色过渡。
    # 参考稿（star/love/mbti）body 外的像素全部是浅色（最暗 ~208），而 fun/career
    # 原稿 body 外有一圈深色（matting 遗留 + 合成接触影），页面上读作「奇怪的阴影」。
    # 故 body 外一律改用浅色过渡，与参考稿对齐。
    bled = _bleed_from(rgb, body)
    page = np.array([254.0, 250.0, 244.0])
    a01 = (new_alpha / 255.0)[..., None]
    edge_rgb = bled * a01 + page * (1.0 - a01)
    outside_edge = (new_alpha > 0) & ~body
    rgb_new = np.where(outside_edge[..., None], edge_rgb, rgb)
    out = np.dstack([rgb_new, new_alpha]).clip(0, 255).astype('uint8')
    res = Image.fromarray(out, 'RGBA')
    res.save(os.path.join(PREP, out_name))
    dark = int(((new_alpha > 0) & ~body & (rgb_new.max(axis=2) < 200)).sum())
    print(f'{name} -> {out_name} (r {r}, fixed edge px {int(outside_edge.sum())}, dark-semi px {dark})')
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


# ---------- 3. hero：底缘抗锯齿 + 抹掉白字烘焙灰影 ----------

def _aa_bottom_contour(alpha, body_thr=200, ramp=(235, 120, 36, 0)):
    """沿每列各自的真实底界做 2-3px 抗锯齿过渡（不做横向拉直——那会造出硬线）。

    对每列取最后一个实心行 b，重铺 b..b+3 的 alpha 为递减斜坡，跟随内容轮廓，
    既去掉原来 145/165/83 这种单像素硬跳变，又不改变边缘形状。"""
    H, W = alpha.shape
    solid = alpha >= body_thr
    out = alpha.copy()
    for x in range(W):
        ys = np.where(solid[:, x])[0]
        if not len(ys):
            continue
        b = int(ys.max())
        for i, v in enumerate(ramp):
            if b + i < H:
                out[b + i, x] = v
        if b + len(ramp) < H:
            out[b + len(ramp):, x] = 0
    # 只让底缘变软：b 以上的原有内容全部保留
    return out


def _erase_text_shadow(arr, box, blur=6, min_weight=0.2, dark=190):
    """抹掉白字烘焙的深色投影：字形（亮）之外的暗像素即灰影，用归一化卷积估计的
    干净卡面替换它们。字形与蓝底都不动，因此字保持 crisp，也不引入灰晕。"""
    x0, y0, x1, y1 = box
    sub = arr[y0:y1, x0:x1, :3].astype(float)
    lum = sub.mean(axis=2)
    glyph = lum > 200
    shadow = (lum < dark) & ~glyph
    if not shadow.any():
        return 0
    w = (~(glyph | shadow)).astype(float)
    nw = np.array(
        Image.fromarray((w * 255).astype('uint8'), 'L').filter(ImageFilter.GaussianBlur(blur)), dtype=float
    ) / 255.0
    num = np.stack([
        np.array(Image.fromarray((sub[..., c] * w).astype('uint8'), 'L').filter(ImageFilter.GaussianBlur(blur)), dtype=float)
        for c in range(3)
    ], axis=2)
    bg = num / np.maximum(nw, min_weight)[..., None]
    use = shadow & (nw > min_weight)
    sub[use] = bg[use]
    arr[y0:y1, x0:x1, :3] = np.clip(sub, 0, 255)
    return int(use.sum())


def fix_hero(src_name, out_name):
    """① 底缘沿内容轮廓做 2-3px 抗锯齿（去掉单像素硬跳变的锯齿与上一轮拉直造成的硬线）；
    ② 抹掉文字区烘焙的深色灰影（字形不动）。"""
    im = Image.open(os.path.join(SRC, src_name)).convert('RGBA')
    arr = np.array(im)
    arr[..., 3] = _aa_bottom_contour(arr[..., 3])
    n = _erase_text_shadow(arr, (25, 115, 350, 240))
    res = Image.fromarray(arr.clip(0, 255).astype('uint8'), 'RGBA')
    res.save(os.path.join(PREP, out_name))
    print(f'{src_name} -> {out_name} (bottom AA contour + shadow erased {n} px)')
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
