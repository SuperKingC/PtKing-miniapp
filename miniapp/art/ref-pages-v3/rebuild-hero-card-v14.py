# -*- coding: utf-8 -*-
"""hero-card v14：v11 完整画面 + v13 同款修边（内收轮廓 + 本体色 AA），不动云/标题/文字。

背景（2026-09-15）：v11 保留为画面基准后，用户要求继续解决「浅色方形边缘包裹 + 锯齿」。
v13 已证明修边几何有效（2026-09-14 用户验收过边缘效果），但它捆了两件被否的事：
smooth-hero-cloud 把云底抹出平直切边和白色虚线段、标题区雾蓝被抹平。v14 只取修边：

- 以 v11 的 50% 等高线为真实轮廓（灰度 LANCZOS 上采样取阈值，轮廓亚像素平滑，
  修掉 v13 用 NEAREST 二值化在圆角留下的台阶），4x 空间腐蚀 INSET_AT_SS=6
  （≈1.5px@1x）切掉裁切带进来的烘焙暗描边（159,178,187，合成后即「浅色方框」）；
- 高斯 3.0@4x（≈0.75px@1x）+ LANCZOS 缩回，得到约 2px 平滑多级坡（修锯齿）；
- alpha<ALPHA_FLOOR(96) 的外圈浅晕清零（右/下缘 a=4~67 的浅灰环）；
- AA 带 RGB 一律换成腐蚀 6px 后的内部本体色（snap_aa_window + lift_dark_aa），
  合成后是「本体色→页底」的单调过渡，不再有灰色包边；
- 猫/云/面板纹理/文字像素零改动：0<a<255 只存在于外圈约 3px 环带内，
  脚本内置断言「旧 a=255 且新 a=255 的像素 RGB 逐位相等」。

用法：
    python rebuild-hero-card-v14.py
    python rebuild-hero-card-v14.py --restore-alpha   # TinyPNG 后锁回 AA 色
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
PREP = os.path.join(HERE, 'prepared')
SRC = os.path.join(HERE, '..', '..', 'src', 'assets', 'illus')
PREV = os.path.join(HERE, '_edge-preview')
os.makedirs(PREP, exist_ok=True)
os.makedirs(PREV, exist_ok=True)

SS = 4
INSET_AT_SS = 6       # 1.5px@1x，切掉烘焙暗描边
BLUR_AT_SS = 3.0      # ≈0.75px@1x，过渡带约 2px
CONTOUR_THR = 128
BODY_MIN_ALPHA = 250
ALPHA_FLOOR = 96      # 低于此的外圈浅晕一律清零
ERODE_SEED = 6        # 内部本体色种子：再往里 6px，躲开暗描边
BAND_PX = 5           # 只允许距外轮廓 <=5px 的环带内改动，环带外逐位保留
BLEED_ITERS = 80
PAGE = (254, 250, 245)
MAGENTA = (255, 0, 255)

V11 = os.path.join(SRC, 'hero-card-v11.png')
V14_PREP = os.path.join(PREP, 'hero-card-v14.png')
V14_SRC = os.path.join(SRC, 'hero-card-v14.png')


def shift(arr, dy, dx):
    h, w = arr.shape[:2]
    out = np.zeros_like(arr)
    ys = slice(max(dy, 0), h + min(dy, 0))
    yd = slice(max(-dy, 0), h + min(-dy, 0))
    xs = slice(max(dx, 0), w + min(dx, 0))
    xd = slice(max(-dx, 0), w + min(-dx, 0))
    out[yd, xd] = arr[ys, xs]
    return out


def erode(mask, iters):
    out = mask.copy()
    for _ in range(iters):
        nxt = out.copy()
        nxt[1:, :] &= out[:-1, :]
        nxt[:-1, :] &= out[1:, :]
        nxt[:, 1:] &= out[:, :-1]
        nxt[:, :-1] &= out[:, 1:]
        out = nxt
    return out


def snap_aa_window(rgb, alpha, zone, win=3, dark_lum=170):
    """AA 像素改用邻窗不透明本体色；优先跳过 lum<dark_lum 的烘焙暗描边。

    只作用在 zone（环带）内，环带外的内部半透明细节不碰。
    """
    h, w = alpha.shape
    aa = (alpha > 0) & (alpha < 255) & zone
    out = rgb.copy()
    ys, xs = np.where(aa)
    for y, x in zip(ys, xs):
        y0, y1 = max(0, y - win), min(h, y + win + 1)
        x0, x1 = max(0, x - win), min(w, x + win + 1)
        block = rgb[y0:y1, x0:x1]
        solid = alpha[y0:y1, x0:x1] >= BODY_MIN_ALPHA
        if not solid.any():
            continue
        cand = block[solid]
        lum = cand.mean(axis=1)
        bright = lum >= dark_lum
        pick = cand[bright] if bright.any() else cand
        d = np.abs(pick - rgb[y, x]).max(axis=1)
        out[y, x] = pick[d.argmin()]
    return out


def lift_dark_aa(rgb, alpha, zone, win=5, dark_lum=160):
    """外圈浅 AA（a<180）若仍是烘焙暗描边，抬到邻窗最亮的冷色本体。

    只动 zone（环带）内几乎透明侧的暗像素；文字/内部 AA 的 alpha=255，
    且环带外一律不碰。
    """
    h, w = alpha.shape
    opaque = alpha >= BODY_MIN_ALPHA
    panel = opaque[h // 3:h * 2 // 3, w // 8:w // 2]
    panel_rgb = rgb[h // 3:h * 2 // 3, w // 8:w // 2][panel]
    if len(panel_rgb) > 0:
        cool = panel_rgb[:, 2] >= panel_rgb[:, 0]
        fallback = np.median(panel_rgb[cool] if cool.any() else panel_rgb, axis=0)
    else:
        fallback = np.array([190.0, 206.0, 213.0])
    aa = (alpha > 0) & (alpha < 180) & zone
    out = rgb.copy()
    ys, xs = np.where(aa)
    for y, x in zip(ys, xs):
        if rgb[y, x].mean() >= dark_lum:
            continue
        y0, y1 = max(0, y - win), min(h, y + win + 1)
        x0, x1 = max(0, x - win), min(w, x + win + 1)
        block = rgb[y0:y1, x0:x1]
        solid = alpha[y0:y1, x0:x1] >= BODY_MIN_ALPHA
        if solid.any():
            cand = block[solid]
            lum = cand.mean(axis=1)
            cool = (cand[:, 2] >= cand[:, 0]) & (lum >= 180)
            if cool.any():
                pick = cand[cool]
                out[y, x] = pick[pick.mean(axis=1).argmax()]
                continue
        out[y, x] = fallback
    return out


def nearest_body(rgb, seed, iters=BLEED_ITERS):
    out = rgb.copy()
    known = seed.copy()
    for _ in range(iters):
        if known.all():
            break
        nxt = known.copy()
        take = out.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sk = shift(known, dy, dx).astype(bool)
            so = shift(out, dy, dx)
            hit = (~known) & sk & (~nxt)
            take[hit] = so[hit]
            nxt = nxt | hit
        out, known = take, nxt
    return out


def flood_outside(alpha, thr=CONTOUR_THR):
    """从图像边界洪泛 alpha<thr 的外部区域（等值线外侧）。"""
    core = alpha >= thr
    outside = np.zeros(alpha.shape, bool)
    outside[0, :] = ~core[0, :]
    outside[-1, :] = ~core[-1, :]
    outside[:, 0] = ~core[:, 0]
    outside[:, -1] = ~core[:, -1]
    while True:
        nxt = outside.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nxt |= (~core) & shift(outside, dy, dx)
        if (nxt == outside).all():
            return outside
        outside = nxt


def band_mask(alpha, width=BAND_PX):
    """外圈环带：距外部区域切比雪夫距离 <= width 的像素。

    修边只允许发生在环带内；环带外（文字/云纹/星星等内部半透明细节）
    RGBA 逐位保留，这是「不影响文字质量」的硬保障。
    """
    outside = flood_outside(alpha)
    band = outside.copy()
    cur = outside.copy()
    for _ in range(width):
        nxt = cur.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nxt |= shift(cur, dy, dx)
        band |= nxt
        cur = nxt
    return band


def rebuild(src_path, dst_path):
    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img).astype(float)
    h, w = arr.shape[:2]
    old_al = arr[..., 3]
    rgb = arr[..., :3]

    print('  step: band...', flush=True)
    band = band_mask(old_al)
    print(f'  step: band done ({int(band.sum())} px)', flush=True)

    # 轮廓：灰度 alpha LANCZOS 4x 上采样 → 50% 阈值（亚像素平滑）→ 内收切暗描边
    up = Image.fromarray(old_al.astype('uint8'), 'L').resize(
        (w * SS, h * SS), Image.Resampling.LANCZOS
    )
    bin4 = np.array(up) >= CONTOUR_THR
    bin4 = erode(bin4, INSET_AT_SS)
    solid = Image.fromarray((bin4.astype('uint8') * 255), 'L')
    blurred = solid.filter(ImageFilter.GaussianBlur(BLUR_AT_SS))
    ramp = np.array(blurred.resize((w, h), Image.Resampling.LANCZOS), dtype=float)
    ramp = np.clip(ramp, 0, 255)
    ramp[ramp < ALPHA_FLOOR] = 0.0
    print('  step: ramp done', flush=True)

    # 环带内才允许改 alpha；原本体若仍落在新轮廓内，保持 255
    new_al = np.where(band, ramp, old_al)
    still_body = band & (old_al >= BODY_MIN_ALPHA) & (ramp >= BODY_MIN_ALPHA)
    new_al = np.where(still_body, 255.0, new_al)

    opaque = new_al >= BODY_MIN_ALPHA
    seed = erode(opaque, ERODE_SEED)
    if int(seed.sum()) < 100:
        seed = opaque
    body = nearest_body(rgb, seed)
    print('  step: body bleed done', flush=True)
    aa = (new_al > 0) & (new_al < 255) & band
    rgb = np.where(aa[..., None], body, rgb)
    rgb = snap_aa_window(rgb, new_al, band)
    print('  step: snap done', flush=True)
    rgb = lift_dark_aa(rgb, new_al, band)
    print('  step: lift done', flush=True)
    rgb = np.where(new_al[..., None] == 0, 0, rgb)

    # 硬保障 1：环带外 RGBA 逐位保留（文字/云纹/星星全在里面）
    keep = ~band
    drift_keep = int((np.abs(np.concatenate([rgb, new_al[..., None]], axis=2)[keep]
                             - arr[keep]) > 0).sum())
    assert drift_keep == 0, f'环带外被改动 {drift_keep} 通道值'
    # 硬保障 2：环带内保持不透明的像素 RGB 不动
    kept = band & (old_al == 255) & (new_al == 255)
    drift = int((np.abs(rgb - arr[..., :3]).max(axis=2)[kept] > 0).sum())
    assert drift == 0, f'环带内不透明像素被改动 {drift} px'

    out = np.zeros_like(arr)
    out[..., :3] = rgb
    out[..., 3] = new_al
    print('  step: saving...', flush=True)
    Image.fromarray(out.astype('uint8'), 'RGBA').save(dst_path)
    print('  step: saved', flush=True)

    changed = (np.abs(out - arr).max(axis=2) > 0)
    print(f'=== {os.path.basename(src_path)} -> {os.path.basename(dst_path)} ===')
    print(f'  size {w}x{h}  aa={int(aa.sum())}  body={int(opaque.sum())}  changed_px={int(changed.sum())}')
    print(f'  alpha levels={len(np.unique(new_al.astype("uint8")))}')
    my = h // 2
    print(f'  left  a y={my}:', new_al[my, :8].astype(int).tolist())
    print(f'  right a y={my}:', new_al[my, -8:].astype(int).tolist())
    print(f'  top   a x={w//2}:', new_al[:8, w // 2].astype(int).tolist())
    print(f'  bot   a x={w//2}:', new_al[-8:, w // 2].astype(int).tolist())
    print(f'  saved {dst_path} ({os.path.getsize(dst_path)} bytes)')
    return out.astype('uint8'), arr.astype('uint8')


def composite_on(arr, bg):
    a = arr[..., 3:4].astype(float) / 255.0
    base = np.zeros((*arr.shape[:2], 3), dtype=float)
    base[:] = bg
    return np.round(arr[..., :3] * a + base * (1.0 - a)).astype('uint8')


def save_preview(name, arr, old_arr):
    page = composite_on(arr, PAGE)
    Image.fromarray(page, 'RGB').save(os.path.join(PREV, f'{name}-page.png'))
    h, w = page.shape[:2]
    my = h // 2
    crops = {
        'left': (0, my - 60, 26, my + 60),
        'right': (w - 26, my - 60, w, my + 60),
        'tl': (0, 0, 110, 80),
        'tr': (w - 110, 0, w, 80),
        'bottom': (60, h - 40, 480, h),
        'cloud': (w - 220, h - 110, w, h),
    }
    for tag, box in crops.items():
        c = Image.fromarray(page, 'RGB').crop(box)
        c.resize(((box[2] - box[0]) * 6, (box[3] - box[1]) * 6), Image.Resampling.NEAREST).save(
            os.path.join(PREV, f'{name}-{tag}.png'))
    # 改动掩码：灰=未动，红=被修改像素（应只有外圈环带）
    diff = (np.abs(arr.astype(int) - old_arr.astype(int)).max(axis=2) > 0)
    vis = np.round(composite_on(arr, PAGE)).astype('uint8')
    vis[diff] = [255, 0, 0]
    Image.fromarray(vis, 'RGB').save(os.path.join(PREV, f'{name}-diffmap.png'))
    print(f'  preview {name} -> {PREV}')


def restore_alpha(prepared_path, compressed_path, tol=8):
    """P 模式就地锁回 prepared 的 AA 色，避免 TinyPNG 把猫/云边缘量化成面板蓝。"""
    truth = np.array(Image.open(prepared_path).convert('RGBA'))
    image = Image.open(compressed_path)
    if image.mode != 'P':
        print(f'  {os.path.basename(compressed_path)} mode={image.mode}，跳过锁回')
        return
    idx = np.array(image)
    trns = image.info.get('transparency')
    lut = np.full(256, 255, dtype=np.uint8)
    if isinstance(trns, (bytes, bytearray)):
        lut[:len(trns)] = list(trns)
    elif isinstance(trns, int):
        lut[trns] = 0
    used = np.bincount(idx.ravel(), minlength=256)
    pal_list = image.getpalette()
    n0 = len(pal_list) // 3
    pal = np.zeros((256, 3), dtype=np.int32)
    pal[:n0] = np.array(pal_list[:n0 * 3], dtype=np.int32).reshape(n0, 3)
    ta = truth[..., 3]
    trgb = truth[..., :3].astype(np.int32)
    crgb = pal[idx]
    aa = (ta > 0) & (ta < 255)
    drift = aa & (np.abs(crgb - trgb).max(axis=2) > tol)
    unused = [i for i in range(256) if used[i] == 0]
    cache = {}
    allocated = 0
    new_idx = idx.copy()
    ys, xs = np.where(drift)
    for y, x in zip(ys, xs):
        t = trgb[y, x]
        a = int(lut[idx[y, x]])  # 保持 TinyPNG 量化后的 alpha（几何已对齐）
        key = (a, int(t[0]), int(t[1]), int(t[2]))
        if key in cache:
            new_idx[y, x] = cache[key]
            continue
        hit = -1
        best = tol + 1
        for i in range(max(n0, 1)):
            if lut[i] != a or used[i] == 0:
                continue
            dd = int(np.abs(pal[i] - t).max())
            if dd < best:
                best = dd
                hit = i
        if hit < 0:
            if not unused:
                new_idx[y, x] = idx[y, x]
                cache[key] = idx[y, x]
                continue
            hit = unused.pop(0)
            pal[hit] = t
            lut[hit] = a
            used[hit] = 1
            n0 = max(n0, hit + 1)
            allocated += 1
        cache[key] = hit
        new_idx[y, x] = hit

    k = 256
    while k > 0 and lut[k - 1] == 255 and used[k - 1] == 0:
        k -= 1
    out = Image.fromarray(new_idx, 'P')
    out.putpalette(pal.astype(np.uint8).ravel().tolist())
    out.save(compressed_path, transparency=bytes(lut[:k].tolist()), optimize=True)
    size = os.path.getsize(compressed_path)
    print(f'  AA drift px={int(drift.sum())} allocated={allocated} cache={len(cache)}')
    print(f'  saved {os.path.basename(compressed_path)} ({size} bytes)')
    if size > 180 * 1024:
        raise SystemExit(f'{compressed_path} 超过 180KB（{size}）')


def main():
    if '--restore-alpha' in sys.argv:
        restore_alpha(V14_PREP, V14_SRC)
        return
    arr, old = rebuild(V11, V14_PREP)
    save_preview('v14', arr, old)


if __name__ == '__main__':
    main()
