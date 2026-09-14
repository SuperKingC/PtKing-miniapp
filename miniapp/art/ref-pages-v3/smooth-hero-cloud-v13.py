# -*- coding: utf-8 -*-
"""从 git HEAD 重修 hero-card-v13：去标题区脏斑，抹圆贴页底的云弧。

包内上一版误用损坏的 prepared，台阶几乎没动。这里只读 HEAD：
- 开放雾蓝底高斯抹平脏斑（奶油字/物件/AA 不碰）
- 只改贴页底的云底缘 y(x)（y>=278 的列，避开纸板），内部纹理不动

成品写 RGBA，不走 TinyPNG。
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'src', 'assets', 'illus')
PREP = os.path.join(HERE, 'prepared')
PREV = os.path.join(HERE, '_edge-preview')
os.makedirs(PREV, exist_ok=True)
os.makedirs(PREP, exist_ok=True)

HEAD_REL = 'src/assets/illus/hero-card-v13.png'
DST_PREP = os.path.join(PREP, 'hero-card-v13.png')
DST_SRC = os.path.join(SRC, 'hero-card-v13.png')
PAGE = np.array([254, 250, 245], dtype=float)

CREAM_MIN = 200
Y_CLOUD = 278
EDGE_SIGMA = 20.0
AA_HALF = 2.4


def dilate(mask, iters):
    out = mask.copy()
    for _ in range(iters):
        nxt = out.copy()
        nxt[1:, :] |= out[:-1, :]
        nxt[:-1, :] |= out[1:, :]
        nxt[:, 1:] |= out[:, :-1]
        nxt[:, :-1] |= out[:, 1:]
        out = nxt
    return out


def load_head():
    raw = subprocess.check_output(
        ['git', 'show', f'HEAD:{HEAD_REL}'],
        cwd=os.path.join(HERE, '..', '..'),
    )
    path = os.path.join(PREV, 'hero-head.png')
    with open(path, 'wb') as f:
        f.write(raw)
    return np.array(Image.open(path).convert('RGBA'))


def cream_color(rgb, mask):
    if not mask.any():
        return np.array([248.0, 243.0, 232.0])
    return np.median(rgb[mask], axis=0)


def despeckle_panel(arr):
    rgb = arr[..., :3]
    alpha = arr[..., 3]
    cream = (rgb.min(axis=2) >= CREAM_MIN) & (alpha >= 80)
    protect = dilate(cream, 3) | (alpha < 250)
    panel = (alpha >= 250) & (rgb[..., 2] > rgb[..., 0] + 4) & (~protect)
    blur = np.array(Image.fromarray(rgb, 'RGB').filter(ImageFilter.GaussianBlur(2.4)))
    out = arr.copy()
    out[panel, :3] = blur[panel]
    # 标题上方再向中位色收一档
    y0, y1, x0, x1 = 88, 132, 12, 280
    tile = panel[y0:y1, x0:x1]
    if tile.any():
        mid = np.median(out[y0:y1, x0:x1][tile, :3], axis=0)
        local = out[y0:y1, x0:x1, :3].astype(float)
        local[tile] = local[tile] * 0.25 + mid * 0.75
        out[y0:y1, x0:x1, :3] = np.clip(local, 0, 255)
    return out, int(panel.sum())


def smooth_line(values, valid, sigma):
    n = len(values)
    out = values.astype(float).copy()
    if valid.sum() < 6:
        return out
    xs = np.arange(n)
    out[~valid] = np.interp(xs[~valid], xs[valid], values[valid])
    radius = max(1, int(sigma * 3))
    kernel = np.exp(-0.5 * (np.arange(-radius, radius + 1) / sigma) ** 2)
    kernel /= kernel.sum()
    padded = np.pad(out, radius, mode='edge')
    sm = np.convolve(padded, kernel, mode='valid')
    sm[~valid] = values[~valid]
    return sm


def rebuild_cloud(arr):
    h, w = arr.shape[:2]
    rgb = arr[..., :3].astype(float)
    alpha = arr[..., 3].astype(float)
    visual = (rgb.min(axis=2) >= CREAM_MIN) & (alpha >= 128)
    solid = (rgb.min(axis=2) >= CREAM_MIN) & (alpha >= 200)
    blue_m = (rgb[..., 2] > rgb[..., 0] + 6) & (alpha >= 200) & (rgb.min(axis=2) < CREAM_MIN)
    blue = np.median(rgb[blue_m], axis=0) if blue_m.any() else np.array([196.0, 213.0, 221.0])
    rim = cream_color(rgb, visual & dilate(~visual, 1))
    body = cream_color(rgb, solid & visual)

    y_raw = np.full(w, -1.0)
    for x in range(w):
        ys = np.where(visual[:, x])[0]
        if len(ys):
            y_raw[x] = float(ys[-1])
    y_ok = y_raw >= Y_CLOUD
    y_s = smooth_line(y_raw, y_ok, EDGE_SIGMA)

    new_al = alpha.copy()
    new_rgb = rgb.copy()
    for x in range(w):
        if not y_ok[x]:
            continue
        yb = y_s[x]
        y0 = max(0, int(np.floor(min(yb, y_raw[x]) - AA_HALF - 1)))
        for y in range(y0, h):
            d = yb - y
            cream_px = rgb[y, x].min() >= CREAM_MIN and alpha[y, x] > 0
            page = alpha[y, x] < 80 and not blue_m[y, x]
            y0b, y1b = max(0, y - 2), min(h, y + 3)
            x0b, x1b = max(0, x - 2), min(w, x + 3)
            n_blue = int(blue_m[y0b:y1b, x0b:x1b].sum())
            n_page = int((alpha[y0b:y1b, x0b:x1b] < 80).sum())
            on_blue = n_blue > n_page and not page

            if d >= AA_HALF:
                if d <= AA_HALF + 1.5 and y > y_raw[x] and not cream_px:
                    new_rgb[y, x] = body
                    new_al[y, x] = 255.0
                continue
            if d <= -AA_HALF:
                if cream_px or visual[y, x]:
                    if on_blue:
                        new_al[y, x] = 255.0
                        new_rgb[y, x] = blue
                    else:
                        new_al[y, x] = 0.0
                        new_rgb[y, x] = 0
                continue
            if solid[y, x] and d >= 0:
                continue
            cover = float(np.clip((d + AA_HALF) / (2.0 * AA_HALF), 0.0, 1.0))
            if on_blue:
                bg = rgb[y, x] if (alpha[y, x] >= 180 and not cream_px) else blue
                new_rgb[y, x] = body * cover + bg * (1.0 - cover)
                new_al[y, x] = 255.0
            else:
                new_rgb[y, x] = rim
                new_al[y, x] = cover * 255.0

    new_rgb[new_al == 0] = 0
    out = arr.copy()
    out[..., :3] = new_rgb
    out[..., 3] = new_al
    return out.astype('uint8')


def composite(arr, bg):
    a = arr[..., 3:4].astype(float) / 255.0
    base = np.zeros((*arr.shape[:2], 3), dtype=float)
    base[:] = bg
    return np.round(arr[..., :3] * a + base * (1.0 - a)).astype('uint8')


def _zoom(rgb, scale):
    return np.array(
        Image.fromarray(rgb).resize(
            (rgb.shape[1] * scale, rgb.shape[0] * scale), Image.Resampling.NEAREST
        )
    )


def preview(before, after):
    page_b = composite(before, PAGE)
    page_a = composite(after, PAGE)
    box = (188, 312, 400, 675)
    b = page_b[box[0]:box[1], box[2]:box[3]]
    a = page_a[box[0]:box[1], box[2]:box[3]]
    Image.fromarray(_zoom(b, 3)).save(os.path.join(PREV, 'cloud-br-src.png'))
    Image.fromarray(_zoom(a, 3)).save(os.path.join(PREV, 'cloud-smooth-under.png'))
    Image.fromarray(np.concatenate([_zoom(b, 3), _zoom(a, 3)], axis=1)).save(
        os.path.join(PREV, 'cloud-smooth-sbs.png')
    )
    tip = (230, 312, 548, 675)
    Image.fromarray(np.concatenate([
        _zoom(page_b[tip[0]:tip[1], tip[2]:tip[3]], 6),
        _zoom(page_a[tip[0]:tip[1], tip[2]:tip[3]], 6),
    ], axis=1)).save(os.path.join(PREV, 'lobe-sbs.png'))
    title = (90, 175, 18, 250)
    Image.fromarray(_zoom(page_a[title[0]:title[1], title[2]:title[3]], 4)).save(
        os.path.join(PREV, 'title-dirt-now.png')
    )
    Image.fromarray(page_a, 'RGB').save(os.path.join(PREV, 'cloud-smooth-page.png'))
    print('preview ->', PREV)


def contour_roughness(alpha, x0, x1):
    ys = []
    for x in range(x0, x1):
        y = np.where(alpha[:, x] >= 128)[0]
        if len(y) == 0:
            continue
        ys.append(int(y[-1]))
    if len(ys) < 6:
        return 0.0, 0
    d2 = np.abs(np.diff(ys, n=2))
    return float(d2.sum()), int((d2 >= 2).sum())


def main():
    before = load_head()
    cleaned, n_panel = despeckle_panel(before)
    after = rebuild_cloud(cleaned)
    r0, j0 = contour_roughness(before[..., 3], 504, 660)
    r1, j1 = contour_roughness(after[..., 3], 504, 660)
    print(f'panel despeckle {n_panel} px')
    print(f'roughness {r0:.0f}->{r1:.0f}  jogs>=2 {j0}->{j1}')
    preview(before, after)
    if '--preview-only' in sys.argv:
        return
    Image.fromarray(after, 'RGBA').save(DST_PREP, optimize=True)
    Image.fromarray(after, 'RGBA').save(DST_SRC, optimize=True)
    print('saved', DST_SRC, os.path.getsize(DST_SRC))
    if os.path.getsize(DST_SRC) > 180 * 1024:
        raise SystemExit(f'{DST_SRC} 超过 180KB')


if __name__ == '__main__':
    main()
