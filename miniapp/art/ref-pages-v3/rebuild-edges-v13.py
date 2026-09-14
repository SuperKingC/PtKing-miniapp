# -*- coding: utf-8 -*-
"""banner v12 / hero-card v13：内收轮廓 + 本体色平滑抗锯齿，扣干净浅边。

病根（2026-09-14 用户仍反馈「边缘有浅浅的边缘，需要扣干净，同时不要有锯齿」）：
上一轮 v11/v12 只清了 alpha<=63 的裙边，但：
1. banner 最外圈仍是 alpha=67 的 3px 坡（2032px），叠米白页底合成 (243,242,239)，
   读作一圈浅灰细环；CSS overflow:hidden + 图自带圆角还双重裁切。
2. hero 左右直边 AA 吃进了插画烘焙的暗描边 RGB (159,178,187)，叠页底合成
   (217,222,222)，比页面 (254,250,245) 暗 37，就是那条浅浅的边。
   v12 还跳过了 defringe。

做法（50% 等高线内收后 4x 超采样重建）：
- 以 alpha>=128 为真实轮廓，4x 空间腐蚀 INSET_AT_SS=6（≈1.5px@1x）切掉暗描边；
- 高斯 3.0@4x（≈0.75px@1x）再 LANCZOS 缩回，得到 2px 级平滑多级坡；
- alpha<ALPHA_FLOOR(96) 的外圈浅晕一律清零（67 那圈浅灰环被切掉）；
- AA 带 RGB 换成「腐蚀 6px 后的内部本体色」（跳过边缘暗描边），只改 RGB 不动几何。

用法：
    python rebuild-edges-v13.py
    python rebuild-edges-v13.py --only banner
    python rebuild-edges-v13.py --in <png> --out <png>
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
BLEED_ITERS = 80
PAGE = (254, 250, 245)
MAGENTA = (255, 0, 255)


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


def snap_aa_window(rgb, alpha, win=3, dark_lum=170):
    """AA 像素改用邻窗不透明本体色；优先跳过 lum<dark_lum 的烘焙暗描边。

    腐蚀种子在圆角/底缘可能拿到远处云/暖米色，7×7 窗口尺子与
    meBannerEdges 契约同一口径，避免角部异色环。
    """
    h, w = alpha.shape
    aa = (alpha > 0) & (alpha < 255)
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


def lift_dark_aa(rgb, alpha, win=5, dark_lum=160):
    """外圈浅 AA（a<180）若仍是烘焙暗描边，抬到邻窗最亮的冷色本体。

    只动几乎透明侧的暗像素，避开猫/云近不透明边缘（a>=180）。
    邻窗全是暗描边时，回退到画面中部冷色面板本体中位色。
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
    aa = (alpha > 0) & (alpha < 180)
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


def rebuild(src_path, dst_path):
    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img).astype(float)
    h, w = arr.shape[:2]
    old_al = arr[..., 3]
    rgb = arr[..., :3]

    core = old_al >= CONTOUR_THR
    up = Image.fromarray((core.astype('uint8') * 255), 'L').resize(
        (w * SS, h * SS), Image.Resampling.NEAREST
    )
    bin4 = np.array(up) >= 128
    bin4 = erode(bin4, INSET_AT_SS)
    solid = Image.fromarray((bin4.astype('uint8') * 255), 'L')
    blurred = solid.filter(ImageFilter.GaussianBlur(BLUR_AT_SS))
    ramp = np.array(blurred.resize((w, h), Image.Resampling.LANCZOS), dtype=float)
    ramp = np.clip(ramp, 0, 255)
    ramp[ramp < ALPHA_FLOOR] = 0.0

    # 原本体若仍落在新轮廓内，保持 255，避免把插画内部半透明细节改掉
    new_al = ramp
    still_body = (old_al >= BODY_MIN_ALPHA) & (ramp >= BODY_MIN_ALPHA)
    new_al = np.where(still_body, 255.0, new_al)

    opaque = new_al >= BODY_MIN_ALPHA
    seed = erode(opaque, ERODE_SEED)
    if int(seed.sum()) < 100:
        seed = opaque
    body = nearest_body(rgb, seed)
    aa = (new_al > 0) & (new_al < 255)
    rgb = np.where(aa[..., None], body, rgb)
    rgb = snap_aa_window(rgb, new_al)
    rgb = lift_dark_aa(rgb, new_al)
    rgb = np.where(new_al[..., None] == 0, 0, rgb)

    out = np.zeros_like(arr)
    out[..., :3] = rgb
    out[..., 3] = new_al
    Image.fromarray(out.astype('uint8'), 'RGBA').save(dst_path)

    print(f'=== {os.path.basename(src_path)} -> {os.path.basename(dst_path)} ===')
    print(f'  size {w}x{h}  aa={int(aa.sum())}  body={int(opaque.sum())}')
    print(f'  alpha levels={len(np.unique(new_al.astype("uint8")))}')
    print(f'  left  a y={h//2}:', new_al[h // 2, :12].astype(int).tolist())
    print(f'  left  rgb first AA:', end=' ')
    row = new_al[h // 2]
    for x in range(w):
        if 0 < row[x] < 255:
            print(tuple(out[h // 2, x, :3].astype(int)), f'a={int(row[x])}')
            break
    print(f'  right a:', new_al[h // 2, -12:].astype(int).tolist())
    print(f'  top   a:', new_al[:12, w // 2].astype(int).tolist())
    print(f'  bot   a:', new_al[-12:, w // 2].astype(int).tolist())
    low = int(((new_al > 0) & (new_al < ALPHA_FLOOR)).sum())
    print(f'  remaining a in (0,{ALPHA_FLOOR}): {low}')
    print(f'  saved {dst_path} ({os.path.getsize(dst_path)} bytes)')
    return out.astype('uint8')


def composite_on(arr, bg):
    a = arr[..., 3:4].astype(float) / 255.0
    base = np.zeros((*arr.shape[:2], 3), dtype=float)
    base[:] = bg
    return np.round(arr[..., :3] * a + base * (1.0 - a)).astype('uint8')


def zoom_corner(arr, side=80, scale=4):
    h, w = arr.shape[:2]
    crops = {
        'tl': arr[:side, :side],
        'tr': arr[:side, w - side:],
        'bl': arr[h - side:, :side],
        'br': arr[h - side:, w - side:],
    }
    out = {}
    for k, c in crops.items():
        im = Image.fromarray(c, 'RGB' if c.shape[-1] == 3 else 'RGBA')
        out[k] = im.resize((c.shape[1] * scale, c.shape[0] * scale), Image.Resampling.NEAREST)
    return out


def save_preview(name, arr):
    page = composite_on(arr, PAGE)
    mag = composite_on(arr, MAGENTA)
    Image.fromarray(page, 'RGB').save(os.path.join(PREV, f'{name}-page.png'))
    Image.fromarray(mag, 'RGB').save(os.path.join(PREV, f'{name}-magenta.png'))
    for tag, im in zoom_corner(page).items():
        im.save(os.path.join(PREV, f'{name}-page-{tag}.png'))
    print(f'  preview {name} -> {PREV}')


def restore_alpha(prepared_path, compressed_path, tol=8):
    """P 模式就地锁回 prepared 的 AA 色，避免 TinyPNG 把猫/云边缘量化成面板蓝。

    只改 0<alpha<255 且与 prepared RGB 最大通道差 >tol 的像素：优先复用同 alpha
    且色距<=tol 的已有槽，否则启用空闲槽。透明区与不透明本体一概不动，
    文件保持 PNG8，体积不回到 RGBA。
    """
    truth = np.array(Image.open(prepared_path).convert('RGBA'))
    image = Image.open(compressed_path)
    if image.mode != 'P':
        raise SystemExit(f'{compressed_path} 不是 P 模式（mode={image.mode}）')
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
    return size


def main():
    only = None
    explicit_in = None
    explicit_out = None
    if '--only' in sys.argv:
        only = sys.argv[sys.argv.index('--only') + 1]
    if '--in' in sys.argv:
        explicit_in = sys.argv[sys.argv.index('--in') + 1]
    if '--out' in sys.argv:
        explicit_out = sys.argv[sys.argv.index('--out') + 1]

    if '--restore-alpha' in sys.argv:
        pairs = []
        if only in (None, 'banner'):
            pairs.append((
                os.path.join(PREP, 'me-banner-panel-v12.png'),
                os.path.join(SRC, 'me-banner-panel-v12.png'),
            ))
        if only in (None, 'hero'):
            pairs.append((
                os.path.join(PREP, 'hero-card-v13.png'),
                os.path.join(SRC, 'hero-card-v13.png'),
            ))
        for prep, dst in pairs:
            print(f'=== restore {os.path.basename(dst)} ===')
            restore_alpha(prep, dst)
        return

    if explicit_in:
        arr = rebuild(explicit_in, explicit_out or explicit_in)
        save_preview('custom', arr)
        return

    jobs = []
    if only in (None, 'banner'):
        jobs.append((
            os.path.join(SRC, 'me-banner-panel-v11.png'),
            os.path.join(PREP, 'me-banner-panel-v12.png'),
            'banner-v12',
        ))
    if only in (None, 'hero'):
        jobs.append((
            os.path.join(SRC, 'hero-card-v11.png'),
            os.path.join(PREP, 'hero-card-v13.png'),
            'hero-v13',
        ))

    for src, dst, tag in jobs:
        arr = rebuild(src, dst)
        save_preview(tag, arr)
        print()


if __name__ == '__main__':
    main()
