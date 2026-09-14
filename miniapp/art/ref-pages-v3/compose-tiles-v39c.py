# -*- coding: utf-8 -*-
"""tile v39c：用户参考图就是 v28 那套清晰圆球+J 线。

v39b 把 v9 整块塞进内圈，变成板中板。
v39c 用已经在 172 上画清楚的 v28 内芯，外圈仍用 love（圆角/内翻棱/落影）。
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
PREP = HERE / "prepared"
SRC = HERE.parent.parent / "src" / "assets" / "illus"
REF = SRC / "tile-love-v10.png"
SOURCE = SRC / "tile-fun-v28.png"
OUTPUT = PREP / "tile-fun-v39.png"
PREP.mkdir(parents=True, exist_ok=True)
PAGE = np.array([254.0, 250.0, 244.0])


def bbox(mask):
    ys, xs = np.where(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def feather(mask_f, radius=4.0):
    im = Image.fromarray(np.clip(mask_f * 255.0, 0, 255).astype(np.uint8), "L")
    im = im.filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(im, dtype=np.float32) / 255.0


def main():
    love = np.asarray(Image.open(REF).convert("RGBA"), dtype=np.float32)
    src = np.asarray(Image.open(SOURCE).convert("RGBA").resize((love.shape[1], love.shape[0]), Image.Resampling.LANCZOS), dtype=np.float32)
    love_rgb, love_a = love[..., :3], love[..., 3] / 255.0
    src_rgb = src[..., :3]
    solid = love_a >= 0.5
    x0, y0, x1, y1 = bbox(solid)
    inset = 22
    wipe = np.zeros_like(solid)
    wipe[y0 + inset : y1 - inset + 1, x0 + inset : x1 - inset + 1] = True
    wipe_f = feather(wipe.astype(np.float32), 3.0)
    out = love_rgb * (1.0 - wipe_f[..., None]) + src_rgb * wipe_f[..., None]
    out_a = love_a.copy()
    out_a[wipe] = np.maximum(out_a[wipe], 1.0)

    final = np.dstack([out, out_a * 255.0])
    final[..., :3] = np.where(out_a[..., None] > 1e-6, final[..., :3], PAGE)
    Image.fromarray(final.astype(np.uint8), "RGBA").save(OUTPUT)
    print(f"fun v39c hybrid v28 inner inset={inset}")

    user_ref = Path(
        r"C:\Users\admin\.cursor\projects\d-Mine-PtKing-miniapp\assets"
        r"\c__Users_admin_AppData_Roaming_Cursor_User_workspaceStorage_"
        r"82a36c340e95d2cfdc330b44ebc1acff_images_image-5ef1cd61-1ab9-4df7-bd09-fac7a9898843.png"
    )
    names = [
        SRC / "tile-love-v10.png",
        user_ref,
        SRC / "tile-fun-v28.png",
        SRC / "tile-fun-v38.png",
        OUTPUT,
    ]
    gap, pad = 16, 20
    strip = Image.new("RGB", (pad * 2 + 172 * len(names) + gap * (len(names) - 1), 172 + pad * 2), (254, 250, 244))
    x = pad
    for p in names:
        bg = Image.new("RGBA", (172, 172), (254, 250, 244, 255))
        im = Image.open(p).convert("RGBA")
        im = im.resize((172, 172), Image.Resampling.LANCZOS if im.size != (172, 172) else Image.Resampling.NEAREST)
        bg.alpha_composite(im)
        strip.paste(bg.convert("RGB"), (x, pad))
        x += 172 + gap
    preview = HERE / "_scratch_preview_v39.png"
    strip.save(preview)
    print(f"preview -> {preview}")


if __name__ == "__main__":
    main()
