# -*- coding: utf-8 -*-
"""tile v35：沿用 v34 的 love 外圈/圆角/内翻棱，只把内部图案洗干净。

v34 验收：外圈和边缘对了。用户截图：气球顶发脏灰、公文包本体被桃浆糊住。
脏源：
  1. 残差生长 residual>10 把源板面光晕算进物体，下采样后奶油里渗桃
  2. 物体外像素是桃，LANCZOS 把桃拉进边缘
  3. 中心挖洞用大半径模糊，留下一块脏补丁
  4. 板面颗粒和合成接触影叠在物件上
v35 不改外圈 28px；中心改干净中位色；物体掩膜拒桃、缩前填奶油、硬边合成。
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
GEN = HERE / "generated"
PREP = HERE / "prepared"
SRC = HERE.parent.parent / "src" / "assets" / "illus"
REF = SRC / "tile-love-v10.png"
PREP.mkdir(parents=True, exist_ok=True)

SOURCE = {
    "fun": GEN / "tile-fun-v9.png",
    "career": GEN / "tile-career-v3.png",
}
OUTPUT = {
    "fun": PREP / "tile-fun-v35.png",
    "career": PREP / "tile-career-v35.png",
}
MATTE_SIDE = 1024
PAGE = np.array([254.0, 250.0, 244.0])
BODY_WIDTH_FACTOR = {"fun": 1.08, "career": 1.22}


def bbox(mask):
    ys, xs = np.where(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def feather(mask_f, radius=0.6):
    im = Image.fromarray(np.clip(mask_f * 255.0, 0, 255).astype(np.uint8), "L")
    im = im.filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(im, dtype=np.float32) / 255.0


def erode(mask, radius):
    im = Image.fromarray((mask.astype(np.uint8) * 255), "L")
    im = im.filter(ImageFilter.MinFilter(radius * 2 + 1))
    return np.asarray(im) > 127


def flood_color(rgb, seeds, tol):
    h, w = rgb.shape[:2]
    seen = np.zeros((h, w), dtype=bool)
    cols = [rgb[y, x] for y, x in seeds if 0 <= y < h and 0 <= x < w]
    if not cols:
        return seen
    ref = np.median(np.stack(cols, axis=0), axis=0)
    q = deque()
    for y, x in seeds:
        if 0 <= y < h and 0 <= x < w and not seen[y, x]:
            if np.max(np.abs(rgb[y, x] - ref)) <= tol:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if ny < 0 or nx < 0 or ny >= h or nx >= w or seen[ny, nx]:
                continue
            if np.max(np.abs(rgb[ny, nx] - ref)) <= tol:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def flood_binary(binary, seeds):
    h, w = binary.shape
    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for y, x in seeds:
        if 0 <= y < h and 0 <= x < w and binary[y, x] and not seen[y, x]:
            seen[y, x] = True
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if ny < 0 or nx < 0 or ny >= h or nx >= w or seen[ny, nx] or not binary[ny, nx]:
                continue
            seen[ny, nx] = True
            q.append((ny, nx))
    return seen


def keep_large(mask, min_px):
    raw = mask.astype(bool)
    if not raw.any():
        return raw
    h, w = raw.shape
    labels = np.zeros((h, w), dtype=np.int32)
    current = 0
    sizes = {}
    for y in range(h):
        xs = np.where(raw[y] & (labels[y] == 0))[0]
        for x in xs:
            if labels[y, x] != 0 or not raw[y, x]:
                continue
            current += 1
            q = deque([(y, x)])
            labels[y, x] = current
            n = 0
            while q:
                cy, cx = q.popleft()
                n += 1
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and raw[ny, nx] and labels[ny, nx] == 0:
                        labels[ny, nx] = current
                        q.append((ny, nx))
            sizes[current] = n
    keep = np.zeros_like(raw)
    if not sizes:
        return keep
    if min_px <= 0:
        return labels == max(sizes, key=sizes.get)
    for lab, n in sizes.items():
        if n >= min_px:
            keep |= labels == lab
    return keep


def extract_object(rgb):
    h, w = rgb.shape[:2]
    bg = flood_color(rgb, [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)], tol=14)
    tile = ~bg
    if tile.sum() < 100:
        raise RuntimeError("未能从白底分出 tile")
    tx0, ty0, tx1, ty1 = bbox(tile)
    tw, th = tx1 - tx0 + 1, ty1 - ty0 + 1
    inset = max(12, int(min(tw, th) * 0.13))
    inner = np.zeros_like(tile)
    inner[ty0 + inset:ty1 - inset + 1, tx0 + inset:tx1 - inset + 1] = True
    band = tile & ~inner
    plate_ref = np.median(rgb[band], axis=0)
    seed = rgb.copy()
    seed[inner] = plate_ref
    # 中位色空板即可，70 轮扩散会把物体附近也染脏
    empty = seed
    residual = np.max(np.abs(rgb - empty), axis=2)
    d_plate = np.max(np.abs(rgb - plate_ref), axis=2)
    core = tile & inner & (residual > 36) & (d_plate > 22)
    core = keep_large(core, min_px=max(200, tile.sum() // 80))
    if not core.any():
        raise RuntimeError(f"残差核为空 residual.max={residual[tile].max():.1f}")
    seeds = list(zip(*np.where(core)))
    seeds = seeds[:: max(1, len(seeds) // 80)]
    grow = tile & inner & (residual > 24) & (d_plate > 16)
    obj = flood_binary(grow, seeds)
    obj = keep_large(obj, min_px=max(200, tile.sum() // 80))
    if obj.sum() < 80:
        raise RuntimeError("物体掩膜为空")
    return obj, plate_ref


def empty_love_plate(ref_rgb, ref_a):
    """外圈 28px 原样保留；中心用环带中位色铺平，去掉 v34 那块脏补丁。"""
    solid = ref_a >= 0.5
    if solid.sum() < 100:
        raise RuntimeError("love 板面为空")
    x0, y0, x1, y1 = bbox(solid)
    inset = 28
    wipe = np.zeros_like(solid)
    wipe[y0 + inset:y1 - inset + 1, x0 + inset:x1 - inset + 1] = True
    ring = solid & ~wipe
    med = np.median(ref_rgb[ring], axis=0)
    # 只用环带的上下亮度差做极弱纵向光，不引入模糊脏斑
    ys, xs = np.where(ring)
    y_norm = (ys.astype(np.float32) - y0) / max(1, y1 - y0)
    lum = ref_rgb[ring].mean(axis=1)
    # 线性 lum = a + b*y
    b = float(np.polyfit(y_norm, lum, 1)[0]) if len(lum) > 8 else 0.0
    base = ref_rgb.copy()
    wy, wx = np.where(wipe)
    t = (wy.astype(np.float32) - y0) / max(1, y1 - y0)
    ring_mid = float(np.median(lum))
    lift = np.clip((t - 0.45) * b, -8.0, 8.0)
    clean = ref_rgb.copy()
    clean[wipe] = np.clip(med + lift[:, None], 0, 255)
    # 心形距挖洞边约 9px，4px 软接只混外圈真板面，不会把心形渗回来
    wipe_f = feather(wipe.astype(np.float32), 4.0)
    base = ref_rgb * (1.0 - wipe_f[..., None]) + clean * wipe_f[..., None]
    heart = np.zeros_like(solid)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 - 2
    hw, hh = 84, 70
    heart[int(cy - hh / 2):int(cy + hh / 2), int(cx - hw / 2):int(cx + hw / 2)] = True
    out_a = ref_a.copy()
    out_a[wipe] = np.maximum(out_a[wipe], 1.0)
    return base, heart, wipe, out_a


def place_on_canvas(arr, dx, dy, canvas=172):
    out = np.zeros((canvas, canvas) + arr.shape[2:], dtype=np.float32)
    h, w = arr.shape[:2]
    y0, y1 = dy, dy + h
    x0, x1 = dx, dx + w
    cy0, cy1 = max(y0, 0), min(y1, canvas)
    cx0, cx1 = max(x0, 0), min(x1, canvas)
    if cy1 <= cy0 or cx1 <= cx0:
        return out
    out[cy0:cy1, cx0:cx1] = arr[cy0 - y0:cy1 - y0, cx0 - dx:cx1 - dx]
    return out


def main():
    ref = np.asarray(Image.open(REF).convert("RGBA"), dtype=np.float32)
    ref_rgb = ref[..., :3].copy()
    ref_a = ref[..., 3] / 255.0
    base, heart, wipe, out_a = empty_love_plate(ref_rgb, ref_a)
    hx0, hy0, hx1, hy1 = bbox(heart)
    heart_cx = (hx0 + hx1) / 2
    heart_cy = (hy0 + hy1) / 2
    heart_w = hx1 - hx0 + 1
    print(f"love heart={heart_w}x{hy1 - hy0 + 1} wipe={int(wipe.sum())}")
    Image.fromarray(base.astype(np.uint8), "RGB").save(PREP / "debug-empty-love-v35.png")

    for name in SOURCE:
        rgb = np.asarray(
            Image.open(SOURCE[name]).convert("RGB").resize((MATTE_SIDE, MATTE_SIDE), Image.Resampling.LANCZOS),
            dtype=np.float32,
        )
        obj, plate_ref = extract_object(rgb)
        bx0, by0, bx1, by1 = bbox(obj)
        ow, oh = bx1 - bx0 + 1, by1 - by0 + 1
        body = erode(obj, 2)
        if body.sum() < 40:
            body = obj
        body_cx = float(np.mean(np.where(body)[1]))
        body_cy = float(np.mean(np.where(body)[0]))
        body_w = bbox(body)[2] - bbox(body)[0] + 1

        target_w = max(12, round(heart_w * BODY_WIDTH_FACTOR[name]))
        scale = target_w / body_w
        tw, th = max(8, round(ow * scale)), max(8, round(oh * scale))

        # 缩前把物体外填成物体中位奶油，避免 LANCZOS 把桃边拉进图案
        cream = np.median(rgb[obj], axis=0)
        filled = np.where(obj[..., None], rgb, cream)
        rgb_r = np.asarray(
            Image.fromarray(filled.astype(np.uint8), "RGB")
            .crop((bx0, by0, bx1 + 1, by1 + 1))
            .resize((tw, th), Image.Resampling.LANCZOS),
            dtype=np.float32,
        )
        m_r = feather(
            np.asarray(
                Image.fromarray((obj[by0:by1 + 1, bx0:bx1 + 1].astype(np.uint8) * 255), "L")
                .resize((tw, th), Image.Resampling.LANCZOS),
                dtype=np.float32,
            )
            / 255.0,
            0.45,
        )
        # 硬一点：半透明环不再用脏源色
        m_hard = np.clip((m_r - 0.28) / 0.50, 0, 1)

        dx = int(round(heart_cx - (body_cx - bx0) * scale))
        dy = int(round(heart_cy - (body_cy - by0) * scale))

        out = base.copy()
        m3 = place_on_canvas(m_hard, dx, dy)
        o3 = place_on_canvas(rgb_r, dx, dy)
        # 接触影只落在板面、且躲开物体本体，避免把奶油染脏
        sh = feather(place_on_canvas(m_hard, dx, dy + 2), 1.8) * 0.10
        sh = sh * (1.0 - m3)
        out = out * (1 - sh[..., None]) + np.array([176.0, 146.0, 118.0]) * sh[..., None]
        out = out * (1 - m3[..., None]) + o3 * m3[..., None]
        out = np.clip(out, 0, 255)

        final = np.dstack([out, out_a * 255.0])
        final[..., :3] = np.where(out_a[..., None] > 1e-6, final[..., :3], PAGE)
        Image.fromarray(final.astype(np.uint8), "RGBA").save(OUTPUT[name])
        print(f"{name}: cream={cream.astype(int)} obj={ow}x{oh} -> {tw}x{th} @({dx},{dy})")
        Image.fromarray((obj.astype(np.uint8) * 255), "L").save(PREP / f"debug-obj-{name}-v35.png")

    names = [
        ("love", SRC / "tile-love-v10.png"),
        ("mbti", SRC / "tile-mbti-v10.png"),
        ("fun-v34", SRC / "tile-fun-v34.png"),
        ("career-v34", SRC / "tile-career-v34.png"),
        ("fun-v35", OUTPUT["fun"]),
        ("career-v35", OUTPUT["career"]),
    ]
    tiles = [Image.open(p).convert("RGBA") for _, p in names if p.exists()]
    gap, pad = 16, 20
    strip = Image.new("RGB", (pad * 2 + 172 * len(tiles) + gap * (len(tiles) - 1), 172 + pad * 2), (254, 250, 244))
    x = pad
    for tile in tiles:
        bg = Image.new("RGBA", (172, 172), (254, 250, 244, 255))
        bg.alpha_composite(tile.convert("RGBA").resize((172, 172), Image.Resampling.NEAREST))
        strip.paste(bg.convert("RGB"), (x, pad))
        x += 172 + gap
    preview = HERE / "_scratch_preview_v35.png"
    strip.save(preview)
    print(f"preview -> {preview}")


if __name__ == "__main__":
    main()
