# -*- coding: utf-8 -*-
"""tile 第十二轮（v22）：内翻棱力度补足 + 修公文包棱发灰。

用户第二轮反馈（对着放大截图逐 tile 比对）：v21 仍「不太对」。实测两处偏差：

  1. **棱被权重稀释**：v21 的权重从边缘向内线性衰减，最深 k≈11 处只乘了 ~56% 力度，
     实测峰值 92，参考 105~114 → 棱发虚。改为「k≤16 全力、16→26 平滑衰减」。
  2. **公文包棱发灰发蓝**：v21 用「参考合成色 + 本 tile 板面色偏移」重绘，公文包板色偏粉
     （板色 (230,182,164)），偏移后暗棱成了脏紫灰（y160 合成 (228,223,231)，偏冷）；
     参考的棱是**暖褐**（(196,140,98)，B 通道比板面低 36%）。改为：暗区（k≥3）用
     **乘性比率**（参考色/参考板面）乘在本体色上——保板面纹理与暖色相，浅色余晖
     （k<3）保持绝对参考色 + 板面偏移。

其余沿用 v21：光滑圆角轮廓、上/右干净、体外无附加 alpha。
"""
import os
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
PREP = os.path.join(HERE, 'prepared')
PAGE = np.array([254.0, 250.0, 244.0])

TILES = {
    'tile-fun-v20.png': 'tile-fun-v22.png',
    'tile-career-v20.png': 'tile-career-v22.png',
}

SS = 8                 # 超采样倍率（覆盖率 → 连续 AA 无台阶）
BAND_MAX = 26.0        # 棱剖面最长作用距离（px）
RAMP_IN = 16.0         # k≤RAMP_IN 权重全力（不稀释最深的棱）
RAMP_OUT = 26.0        # k>RAMP_IN 向外平滑衰减到 0
PLATE_RGB = np.array([242.0, 191.0, 153.0])   # 参考稿板面色
LIGHT_RIM = np.array([252.0, 245.0, 233.0])   # 参考稿实体外的浅色余晖（AA 环）
BRIGHT_K = 3           # k<BRIGHT_K 视作最外「亮余晖」段（绝对色重绘）；k≥ 用乘性比率

# 参考稿 tile-love-v10 平直段实测：自 alpha=128 边向内 k px → 合成色
KS = np.arange(26, dtype=float)
BOT_C = np.array([(252, 245, 233), (247, 240, 230), (245, 236, 225), (240, 232, 221), (236, 228, 216),
                  (231, 221, 207), (226, 214, 198), (222, 210, 194), (217, 203, 184), (211, 193, 172),
                  (205, 176, 143), (196, 140, 98), (210, 140, 91), (220, 154, 108), (223, 159, 115),
                  (230, 168, 125), (235, 175, 133), (235, 178, 138), (239, 184, 145), (241, 185, 145),
                  (241, 187, 148), (241, 187, 148), (242, 191, 153), (242, 190, 149), (242, 191, 153),
                  (242, 191, 153)], dtype=float)
LFT_C = np.array([(236, 228, 216), (234, 224, 211), (229, 218, 203), (226, 214, 198), (220, 192, 161),
                  (208, 154, 113), (227, 164, 120), (230, 171, 130), (235, 178, 138), (235, 184, 145),
                  (238, 187, 148), (238, 188, 150), (241, 190, 153), (238, 190, 153), (242, 191, 153),
                  (242, 191, 153), (242, 191, 153), (242, 191, 153), (242, 191, 153), (242, 191, 153),
                  (242, 191, 153), (238, 190, 153), (242, 191, 153), (241, 190, 153), (242, 191, 153),
                  (236, 190, 153)], dtype=float)


def measure_radius(solid):
    """从直边段量圆角半径：左上角处左缘首次回到最左 x 的行距。"""
    ys, xs = np.where(solid)
    x0, y0 = int(xs.min()), int(ys.min())
    for dy in range(0, 70):
        r = np.where(solid[y0 + dy])[0]
        if len(r) and r.min() <= x0:
            return dy
    return 30


def rounded_mask(solid, radius, ss=SS, sigma=0.9):
    """按实体 bbox + 指定圆角半径重出光滑遮罩（替掉 v20 参差的轮廓）。

    sigma 把 ~1px 的覆盖率斜坡略加宽：TinyPNG 量化会抹掉极低 alpha 的像素，
    斜坡太窄时压缩后圆角会退化成硬台阶（实测过）。"""
    ys, xs = np.where(solid)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    H, W = solid.shape
    big = Image.new('L', (W * ss, H * ss), 0)
    ImageDraw.Draw(big).rounded_rectangle(
        (x0 * ss, y0 * ss, (x1 + 1) * ss - 1, (y1 + 1) * ss - 1), radius=int(round(radius * ss)), fill=255)
    cov = np.asarray(big, dtype=float).reshape(H, ss, W, ss).mean(axis=(1, 3)) / 255.0
    a = np.asarray(
        Image.fromarray((cov * 255).astype('uint8'), 'L').filter(ImageFilter.GaussianBlur(sigma)),
        dtype=float) / 255.0
    return np.clip(a, 0.0, 1.0)


def color_at(c_table, dist):
    k = np.clip(dist, 0, 25)
    return np.stack([np.interp(k, KS, c_table[:, c], left=c_table[0, c], right=c_table[-1, c])
                     for c in range(3)], axis=-1)


def build(src_name, out_name):
    b = np.asarray(Image.open(os.path.join(PREP, src_name)).convert('RGBA')).astype(float)
    solid = b[..., 3] >= 128          # v20 的近白平板 alpha 仅 74~88，天然被排除
    rgb0 = b[..., :3]
    H, W = solid.shape

    radius = measure_radius(solid)
    rmask = rounded_mask(solid, radius)
    alpha = rmask                     # 轮廓即 alpha（含 ~1px 连续抗锯齿，无台阶）

    yy, xx = np.mgrid[0:H, 0:W].astype(float)

    body = rmask > 0.5
    ybot = np.full(W, -1.0)
    for x in range(W):
        c = np.where(body[:, x])[0]
        if len(c):
            ybot[x] = c.max()
    xleft = np.full(H, -1.0)
    for y in range(H):
        r = np.where(body[y, :])[0]
        if len(r):
            xleft[y] = r.min()

    # 板面色：实体左下 1/10~1/4 宽、45%~65% 高的一小块（两个 tile 该处均是板面，无物件）
    ys0, xs0 = np.where(body)
    bx0, by0, bx1, by1 = int(xs0.min()), int(ys0.min()), int(xs0.max()), int(ys0.max())
    bw, bh = bx1 - bx0, by1 - by0
    py0, py1 = by0 + int(bh * 0.45), by0 + int(bh * 0.65)
    px0, px1 = bx0 + int(bw * 0.10), bx0 + int(bw * 0.25)
    patch = body[py0:py1, px0:px1]
    plate = np.median(rgb0[py0:py1, px0:px1][patch], axis=0) if patch.sum() > 20 \
        else np.median(rgb0[body], axis=0)

    db = np.where(ybot[None, :] >= 0, ybot[None, :] - yy, 1e6)     # 到底缘
    dl = np.where(xleft[:, None] >= 0, xx - xleft[:, None], 1e6)   # 到左缘

    # 左缘只在「已到最左」的行有效（否则是左上角曲线，不应染色）
    xmin = xleft[xleft >= 0].min()
    straight_l = (xleft[:, None] >= 0) & (xleft[:, None] <= xmin + 2.0) & (xleft[:, None] > 0)
    dl = np.where(straight_l, dl, 1e6)

    # 权重：k≤RAMP_IN 全力（棱最深处不被稀释），之后平滑衰减
    def band_w(dist):
        return np.where(dist <= RAMP_IN, 1.0,
                        np.clip((RAMP_OUT - dist) / (RAMP_OUT - RAMP_IN), 0.0, 1.0))

    w_b = band_w(db)
    w_l = band_w(dl)
    tot = np.clip(w_b + w_l, 0.0, 1.0)
    band = tot > 1e-3

    cb = color_at(BOT_C, db)
    cl = color_at(LFT_C, dl)
    ws = np.maximum(w_b + w_l, 1e-6)[..., None]
    edge_c = (cb * w_b[..., None] + cl * w_l[..., None]) / ws

    # v20 的透明/近白平板像素统一垫成板面色（拟合轮廓比真实剪影大，缝隙必须先垫底，
    # 否则乘性比率乘在 rgb0=0 上会露出黑洞——实测 v22 首版左缘一串黑点）
    base0 = np.where(solid[..., None], rgb0, plate[None, None, :])

    # 亮余晖段（k<BRIGHT_K）：绝对参考色 + 板面偏移重绘（近白色，不会带色偏）
    bright_rgb = np.clip(edge_c + (plate - PLATE_RGB)[None, None, :], 0, 255)
    # 暗棱段（k≥BRIGHT_K）：乘性比率乘在 base0 上。参考剖面 k=3~9 是「去饱和亮棱」，
    # 其 G/B 比率高达 1.2~1.44，照搬会把暖橙板面染蓝发灰（实测 v22 首版即如此）；
    # 每通道比率 clamp 到 ≤1.02（只允许压暗+微提亮），保留 k≈11 处 (0.81,0.73,0.64)
    # 的暖褐压暗形状。
    ratio_c = np.minimum(edge_c / PLATE_RGB[None, None, :], 1.02)
    mult_rgb = np.clip(base0 * ratio_c, 0, 255)
    use_bright = (np.minimum(db, dl) < BRIGHT_K)[..., None]
    band_rgb = np.where(use_bright, bright_rgb, mult_rgb)

    m = np.where(band, tot, 0.0)[..., None]
    rgb_in = base0 * (1 - m) + band_rgb * m
    rgb_out = np.where(body[..., None], rgb_in, LIGHT_RIM[None, None, :])
    rgb_out = np.clip(rgb_out, 0, 255)

    res = Image.fromarray(
        np.dstack([rgb_out, alpha * 255.0]).clip(0, 255).astype('uint8'), 'RGBA')
    res.save(os.path.join(PREP, out_name))

    comp = rgb_out * alpha[..., None] + PAGE * (1 - alpha[..., None])
    dark = np.clip(PAGE.mean() - comp.mean(axis=2), 0, None)
    ys, xs = np.where(solid)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    ya, yb = y0 + (y1 - y0) // 3, y1 - (y1 - y0) // 3
    xa, xb = x0 + (x1 - x0) // 3, x1 - (x1 - x0) // 3
    print(f'{src_name} -> {out_name}  body=({x0},{y0},{x1},{y1})  plate={plate.round(0)}')
    print('   BOT in d0..24: ' + ' '.join(
        f'{dark[min(y1-d,H-1), xa:xb+1].mean():.0f}' for d in range(0, 25, 2)))
    print('   LFT in d0..24: ' + ' '.join(
        f'{dark[ya:yb, max(x0+d,0)].mean():.0f}' for d in range(0, 25, 2)))
    print('   TOP/RIGHT out d1..2: '
          f'{dark[max(y0-1,0), xa:xb+1].mean():.1f},{dark[max(y0-2,0), xa:xb+1].mean():.1f} | '
          f'{dark[ya:yb, min(x1+1,W-1)].mean():.1f},{dark[ya:yb, min(x1+2,W-1)].mean():.1f}')
    return res


def _sstep(x):
    t = np.clip(x, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def main():
    for s, o in TILES.items():
        build(s, o)


if __name__ == '__main__':
    main()
