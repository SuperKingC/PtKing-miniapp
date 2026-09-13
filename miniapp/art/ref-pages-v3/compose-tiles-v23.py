# -*- coding: utf-8 -*-
"""从 v20 主体重组测试条气球/公文包 tile v23。

v20 的主体 RGB 仍可用，但 alpha 在画布底部有一块固定的近白平板；v22 又把较重的
明暗变化压进了主体内，缺少参考 tile 的主体外空气影。本脚本只读取 v20 与
tile-love-v10：先清理 v20 平板并重建连续圆角主体 alpha，再把 love 的下缘外部影带
按主体 bbox 映射到新画布。v22 不作为任何输入，v23 以 RGBA 无损中间图输出，之后由
compress-tiles-v23.mjs 走 TinyPNG。
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


HERE = Path(__file__).resolve().parent
SRC_DIR = HERE.parent.parent / "src" / "assets" / "illus"
PREP_DIR = HERE / "prepared"
SOURCE = {
    "fun": SRC_DIR / "tile-fun-v20.png",
    "career": SRC_DIR / "tile-career-v20.png",
}
REFERENCE = SRC_DIR / "tile-love-v10.png"
OUTPUT = {
    "fun": PREP_DIR / "tile-fun-v23.png",
    "career": PREP_DIR / "tile-career-v23.png",
}

CANVAS = 172
PAGE = np.array([254.0, 250.0, 244.0])
SS = 8

# love 的橙色实体在中心剖面 y=159 收边，160px 起才是主体外空气影。
# 旧版直接复用 alpha 会把 love 的不透明影带误当成主体，再映射成一条近白矩形尾巴。
REF_BODY_BOTTOM = 159
SHADOW_TINT = np.array([158.0, 132.0, 105.0])
SHADOW_DARKNESS_AT_CONTACT = 76.0

# tile-love-v10 中段实测的主体内翻棱合成色，作为 v23 的统一剖面参考。
PLATE_RGB = np.array([242.0, 191.0, 153.0])
BOT_C = np.array([
    (252, 245, 233), (247, 240, 230), (245, 236, 225), (240, 232, 221),
    (236, 228, 216), (231, 221, 207), (226, 214, 198), (222, 210, 194),
    (217, 203, 184), (211, 193, 172), (205, 176, 143), (196, 140, 98),
    (210, 140, 91), (220, 154, 108), (223, 159, 115), (230, 168, 125),
    (235, 175, 133), (235, 178, 138), (239, 184, 145), (241, 185, 145),
    (241, 187, 148), (241, 187, 148), (242, 191, 153), (242, 190, 149),
    (242, 191, 153), (242, 191, 153),
], dtype=np.float32)
LFT_C = np.array([
    (242, 205, 180), (235, 198, 170), (229, 190, 161), (223, 185, 158),
    (220, 192, 161), (208, 154, 113), (227, 164, 120), (230, 171, 130),
    (235, 178, 138), (235, 184, 145), (238, 187, 148), (238, 188, 150),
    (241, 190, 153), (238, 190, 153), (242, 191, 153), (242, 191, 153),
    (242, 191, 153), (242, 191, 153), (242, 191, 153), (242, 191, 153),
    (242, 191, 153), (238, 190, 153), (242, 191, 153), (241, 191, 153),
    (242, 191, 153), (236, 190, 153),
], dtype=np.float32)


def bbox(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(mask)
    if len(xs) == 0:
        raise ValueError("tile 主体为空")
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def coverage_alpha(mask: np.ndarray) -> np.ndarray:
    """按 v20 的真实剪影生成连续覆盖率，不用拟合圆角覆盖掉底角细节。"""
    h, w = mask.shape
    hi = Image.fromarray((mask.astype(np.uint8) * 255), "L").resize((w * SS, h * SS), Image.Resampling.NEAREST)
    cov = np.asarray(hi, dtype=np.float32).reshape(h, SS, w, SS).mean(axis=(1, 3)) / 255.0
    return np.asarray(
        Image.fromarray((cov * 255.0).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(0.35)),
        dtype=np.float32,
    ) / 255.0


def reference_bottom_shadow() -> tuple[np.ndarray, tuple[int, int, int, int]]:
    ref = np.asarray(Image.open(REFERENCE).convert("RGBA"), dtype=np.float32)
    alpha = ref[..., 3] / 255.0
    yy = np.indices(alpha.shape)[0]
    # love 的外影在 PNG 中仍是高 alpha，不能再把高 alpha 当成实体边界。
    # 用已校准的实体底缘截断，再从合成后的明度差提取影带强度。
    body = (alpha >= (240.0 / 255.0)) & (yy <= REF_BODY_BOTTOM)
    rx0, ry0, rx1, ry1 = bbox(body)
    composited = ref[..., :3] * alpha[..., None] + PAGE[None, None, :] * (1.0 - alpha[..., None])
    darkness = np.clip(PAGE[None, None, :] - composited, 0.0, None).mean(axis=2)
    # 用低 alpha 的暖褐 tint 承载明度差：接触处最实，向外渐隐，避免透明区出现白边。
    shadow_alpha = np.where(
        (yy > REF_BODY_BOTTOM) & (darkness > 0.5),
        np.clip(darkness / SHADOW_DARKNESS_AT_CONTACT, 0.0, 1.0) * 0.6,
        0.0,
    )
    shadow_rgb = np.broadcast_to(SHADOW_TINT, ref[..., :3].shape).copy()
    return np.dstack((shadow_rgb, shadow_alpha * 255.0)), (rx0, ry0, rx1, ry1)


def sample_reference_shadow(
    target_shape: tuple[int, int], target_box: tuple[int, int, int, int],
    ref_rgba: np.ndarray, ref_box: tuple[int, int, int, int],
) -> tuple[np.ndarray, np.ndarray]:
    h, w = target_shape
    tx0, ty0, tx1, ty1 = target_box
    rx0, ry0, rx1, ry1 = ref_box
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u = (xx - tx0) / max(1.0, float(tx1 - tx0))
    v = (yy - ty0) / max(1.0, float(ty1 - ty0))
    rx_raw = np.rint(rx0 + u * (rx1 - rx0)).astype(np.int32)
    ry_raw = np.rint(ry0 + v * (ry1 - ry0)).astype(np.int32)
    valid = (rx_raw >= 0) & (rx_raw < w) & (ry_raw >= 0) & (ry_raw < h)
    rx = np.clip(rx_raw, 0, w - 1)
    ry = np.clip(ry_raw, 0, h - 1)
    rgb = ref_rgba[ry, rx, :3]
    alpha = np.where(valid, ref_rgba[ry, rx, 3] / 255.0, 0.0)
    return rgb, alpha


def extend_body_rgb(rgb: np.ndarray, solid: np.ndarray) -> np.ndarray:
    """把主体边缘 RGB 归一化外扩到 AA 环，避免透明区黑 RGB 被连续 alpha 显出来。"""
    weight = solid.astype(np.float32)
    den = np.asarray(
        Image.fromarray((weight * 255.0).astype(np.uint8), "L")
        .filter(ImageFilter.GaussianBlur(2.0)),
        dtype=np.float32,
    ) / 255.0
    extended = np.zeros_like(rgb)
    for channel in range(3):
        num = np.asarray(
            Image.fromarray((rgb[..., channel] * weight).astype(np.uint8), "L")
            .filter(ImageFilter.GaussianBlur(2.0)),
            dtype=np.float32,
        )
        extended[..., channel] = num / np.maximum(den, 1e-3)
    return np.where(solid[..., None], rgb, extended).clip(0, 255)


def apply_inner_rim(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """按参考 tile 的左/下剖面压出主体内翻棱，保持板面色相而不染蓝灰。"""
    h, w = alpha.shape
    body = alpha >= 0.5
    ys, xs = np.where(body)
    bx0, by0, bx1, by1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    # 每枚 tile 取自身板心色，避免把参考的暖橙板面偏移到公文包的浅粉边缘后发蓝。
    py0, py1 = by0 + int((by1 - by0) * 0.45), by0 + int((by1 - by0) * 0.65)
    px0, px1 = bx0 + int((bx1 - bx0) * 0.10), bx0 + int((bx1 - bx0) * 0.25)
    patch = body[py0:py1, px0:px1]
    plate = np.median(rgb[py0:py1, px0:px1][patch], axis=0) if patch.sum() > 20 else PLATE_RGB
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ybot = np.full(w, -1.0, dtype=np.float32)
    for x in range(w):
        rows = np.where(body[:, x])[0]
        if len(rows): ybot[x] = float(rows.max())
    xleft = np.full(h, -1.0, dtype=np.float32)
    for y in range(h):
        cols = np.where(body[y])[0]
        if len(cols): xleft[y] = float(cols.min())
    db = np.where(ybot[None, :] >= 0, ybot[None, :] - yy, 1e6)
    dl = np.where(xleft[:, None] >= 0, xx - xleft[:, None], 1e6)
    xmin = xleft[xleft >= 0].min()
    straight_left = (xleft[:, None] >= 0) & (xleft[:, None] <= xmin + 2.0) & (xleft[:, None] > 0)
    dl = np.where(straight_left, dl, 1e6)

    def weight(distance: np.ndarray) -> np.ndarray:
        return np.where(distance <= 16.0, 1.0, np.clip((26.0 - distance) / 10.0, 0.0, 1.0))

    wb, wl = weight(db), weight(dl)
    total = np.clip(wb + wl, 0.0, 1.0)

    def color_at(table: np.ndarray, distance: np.ndarray) -> np.ndarray:
        k = np.clip(distance, 0, 25)
        return np.stack([np.interp(k, np.arange(26), table[:, c]) for c in range(3)], axis=-1)

    cb, cl = color_at(BOT_C, db), color_at(LFT_C, dl)
    edge = (cb * wb[..., None] + cl * wl[..., None]) / np.maximum(wb + wl, 1e-6)[..., None]
    ratio = np.minimum(edge / PLATE_RGB[None, None, :], 1.02)
    dark_rgb = np.clip(rgb * ratio, 0, 255)
    # 亮余晖只继承板面偏暗，不把公文包偏粉板色的正 B 偏移带到边缘，避免蓝灰棱。
    plate_offset = np.minimum(plate - PLATE_RGB, 0.0)
    bright_rgb = np.clip(edge + plate_offset[None, None, :], 0, 255)
    rim_rgb = np.where((np.minimum(db, dl) < 3.0)[..., None], bright_rgb, dark_rgb)
    m = np.where(body, total, 0.0)[..., None]
    return np.clip(rgb * (1.0 - m) + rim_rgb * m, 0, 255)


def compose(name: str, ref_rgba: np.ndarray, ref_box: tuple[int, int, int, int]) -> None:
    source = np.asarray(Image.open(SOURCE[name]).convert("RGBA"), dtype=np.float32)
    source_alpha = source[..., 3] / 255.0
    source_distance = np.sqrt(((source[..., :3] - PAGE[None, None, :]) ** 2).sum(axis=2))
    yy_source = np.indices(source_alpha.shape)[0]
    # v20 中心底部 y>=157 是接近页面色的旧影/白板，不是软陶实体；按颜色距页面
    # 清除它，同时保留上方气球高光与公文包浅色材质。
    stale_bottom = (yy_source >= 150) & (source_distance < 70.0)
    solid = (source_alpha >= (128.0 / 255.0)) & (~stale_bottom)
    raw_tx0, raw_ty0, raw_tx1, raw_ty1 = bbox(solid)
    # v20 左侧还夹着一条固定的近白竖条（与主体同 alpha、但不是主体轮廓）。
    # 只在中段直边清除，圆角区域仍完全保留原主体剪影。
    straight_y = (yy_source >= raw_ty0 + 30) & (yy_source <= raw_ty1 - 30)
    left_strip = (np.indices(solid.shape)[1] <= raw_tx0 + 3) & straight_y
    solid = solid & (~left_strip)
    tx0, ty0, tx1, ty1 = bbox(solid)
    target_box = (tx0, ty0, tx1, ty1)
    body_alpha = coverage_alpha(solid)
    # v20 的底部旧平板不属于实体；限制主体 alpha 不越过真实 solid 底缘，
    # 让下面的区域完全由重建后的空气影负责，避免再次合成矩形台座。
    yy = np.indices(body_alpha.shape)[0]
    body_alpha = np.where(yy <= ty1, body_alpha, 0.0)

    shadow_rgb, shadow_alpha = sample_reference_shadow(
        solid.shape, target_box, ref_rgba, ref_box
    )
    # 只保留主体外影，避免参考坐标映射的 anti-alias 回到主体内部。
    shadow_alpha = np.where(body_alpha < 0.5, shadow_alpha, 0.0)
    # 影层在参考末端外会自然变成 0；轻微扩散一个像素，避免 TinyPNG 量化成硬截断。
    shadow_alpha = np.asarray(
        Image.fromarray((shadow_alpha * 255.0).clip(0, 255).astype(np.uint8), "L")
        .filter(ImageFilter.GaussianBlur(0.45)),
        dtype=np.float32,
    ) / 255.0

    body_rgb = apply_inner_rim(extend_body_rgb(source[..., :3], solid), body_alpha)
    out_alpha = body_alpha + shadow_alpha * (1.0 - body_alpha)
    safe = np.maximum(out_alpha, 1e-6)[..., None]
    out_rgb = (
        body_rgb * body_alpha[..., None]
        + shadow_rgb * (shadow_alpha * (1.0 - body_alpha))[..., None]
    ) / safe
    # 全透明区写页面色，避免任何工具把透明 RGB 解释成黑洞；alpha 仍为 0。
    out_rgb = np.where(out_alpha[..., None] > 1e-6, out_rgb, PAGE[None, None, :])

    result = Image.fromarray(
        np.dstack((out_rgb.clip(0, 255), out_alpha.clip(0, 1) * 255.0))
        .astype(np.uint8),
        "RGBA",
    )
    result.save(OUTPUT[name])

    comp = out_rgb * out_alpha[..., None] + PAGE * (1.0 - out_alpha[..., None])
    dark = np.clip(PAGE.mean() - comp.mean(axis=2), 0, None)
    body_box = bbox(body_alpha >= 0.94)
    bx0, by0, bx1, by1 = body_box
    xa = bx0 + (bx1 - bx0) // 3
    xb = bx1 - (bx1 - bx0) // 3
    bottom = [float(dark[min(by1 + d, CANVAS - 1), xa:xb + 1].mean()) for d in range(1, 8)]
    print(
        f"{name}: source_body=({tx0},{ty0},{tx1},{ty1}) "
        f"output_body=({bx0},{by0},{bx1},{by1}) bottom_shadow={['%.1f' % x for x in bottom]}"
    )


def main() -> None:
    PREP_DIR.mkdir(parents=True, exist_ok=True)
    ref_rgba, ref_box = reference_bottom_shadow()
    for name in SOURCE:
        compose(name, ref_rgba, ref_box)


if __name__ == "__main__":
    main()
