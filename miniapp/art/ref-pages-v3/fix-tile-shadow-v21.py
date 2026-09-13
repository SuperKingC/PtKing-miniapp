# -*- coding: utf-8 -*-
"""tile 第十一轮（v21）：气球/公文包的下/左边缘剖面重建为与参考稿同族，并清掉锯齿与近白平板。

用户反馈：测试条里气球与公文包「阴影需要和其他的一样」，现状「不仅阴影不统一还有锯齿」。

把 v20 与参考稿（v10 系 tile）都换算到「自实体视觉边（alpha=128）向内的距离 k」上逐格实测
（只取平直段），参考稿下/左是一条**软陶内翻棱**：

  下缘：k 0 是浅色余晖（α≈0.58），亮度向内在 **k≈11 压到最暗**（合成色 (196,140,98)，
        约板面的 0.74 倍），再向内 ~22px 回到板面；左缘同形但峰在 k≈5、更浅。
  上/右与**左上/右上角**干净（棱只沿下缘+左右下角+左直边）。

v20 三处硬伤：
  1. **影不统一**：影铺在实体**外侧**、峰值仅 ~78 且方向相反，整条带又浅又偏外；
  2. **锯齿**：实体边 alpha 只有 78/198 两级台阶（圆角对斜边逐像素跳变），参考是连续斜坡；
  3. **近白平板**：外侧 alpha 恒 82.5 平铺到画布底——影取样相对坐标越界被 clip 到参考末行
     （近乎页面白）再复制多行所致，合到卡面上几乎看不见却带硬直边。

v21 做法：
  ① alpha 由实体真实轮廓的超采样 SDF 重出（~4px 连续斜坡，体外归零，清掉平板与四角外溢）；
  ② 棱用**轴对齐边距**定位：每列取实体底缘 ybot[x]（含下角曲线）、每行取实体左缘 xleft[y]，
     下缘距离 db=ybot[x]−y 对全体列有效（下角自动沿曲线包过去）；左缘距离 dl=x−xleft[y]
     只在「左缘已到最左」（非左上角）的行有效，从而左上角不被染色；
  ③ 按参考实测的**逐通道色比**（相对板面）乘在本体色上，保色相与板面纹理；
     两向都近（左下角）时按权重融合；
  ④ 只作用在板面像素质上（离板面色远的本体像素不覆盖），上/右与深部保持 v20 原样。
"""
import os
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
PREP = os.path.join(HERE, 'prepared')
PAGE = np.array([254.0, 250.0, 244.0])

TILES = {
    'tile-fun-v20.png': 'tile-fun-v21.png',
    'tile-career-v20.png': 'tile-career-v21.png',
}

SS = 8                 # 超采样倍率（SDF，亚像素精度 → 连续 AA 无台阶）
ALPHA_RAMP = 2.0       # 实体边 alpha 坡宽（px），对齐参考稿（0.62→1 约 2px）
ALPHA_EDGE = 0.5       # 视觉边(sd=0)处的 alpha，参考实测 ≈0.62
KB = 24.0              # 棱剖面最长作用距离（px）
PLATE_RGB = np.array([242.0, 191.0, 153.0])   # 参考稿板面色
LIGHT_RIM = np.array([252.0, 245.0, 233.0])   # 参考稿实体外的浅色余晖（AA 环）

# 参考稿 tile-love-v10 平直段实测：自 alpha=128 边向内 k px → 合成色（相对板面的色比在代码里算）
BOT_K = np.arange(26, dtype=float)
BOT_C = np.array([(252, 245, 233), (247, 240, 230), (245, 236, 225), (240, 232, 221), (236, 228, 216),
                  (231, 221, 207), (226, 214, 198), (222, 210, 194), (217, 203, 184), (211, 193, 172),
                  (205, 176, 143), (196, 140, 98), (210, 140, 91), (220, 154, 108), (223, 159, 115),
                  (230, 168, 125), (235, 175, 133), (235, 178, 138), (239, 184, 145), (241, 185, 145),
                  (241, 187, 148), (241, 187, 148), (242, 191, 153), (242, 190, 149), (242, 191, 153),
                  (242, 191, 153)], dtype=float)
LFT_K = np.arange(26, dtype=float)
LFT_C = np.array([(236, 228, 216), (234, 224, 211), (229, 218, 203), (226, 214, 198), (220, 192, 161),
                  (208, 154, 113), (227, 164, 120), (230, 171, 130), (235, 178, 138), (235, 184, 145),
                  (238, 187, 148), (238, 188, 150), (241, 190, 153), (238, 190, 153), (242, 191, 153),
                  (242, 191, 153), (242, 191, 153), (242, 191, 153), (242, 191, 153), (242, 191, 153),
                  (242, 191, 153), (238, 190, 153), (242, 191, 153), (241, 190, 153), (242, 191, 153),
                  (236, 190, 153)], dtype=float)


def _bfs(mask, other):
    H, W = mask.shape
    d = np.zeros((H, W), dtype=float)
    q = deque()
    for y in range(H):
        for x in range(W):
            if not mask[y, x]:
                continue
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and other[ny, nx]:
                    d[y, x] = 1.0
                    q.append((y, x))
                    break
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and d[ny, nx] == 0:
                d[ny, nx] = d[y, x] + 1.0
                q.append((ny, nx))
    return d


def sdf(mask, ss=SS):
    """超采样符号距离场：实体外为正、内为负，单位 px。"""
    H, W = mask.shape
    big = np.repeat(np.repeat(mask, ss, 0), ss, 1)
    di = _bfs(big, ~big)
    do = _bfs(~big, big)
    signed = np.where(big, -(di - 0.5), (do - 0.5)) / ss
    return signed.reshape(H, ss, W, ss).mean(axis=(1, 3))


def blur(a, sigma):
    lo, hi = float(a.min()), float(a.max())
    scale = hi - lo if hi - lo > 1e-6 else 1.0
    img = Image.fromarray(((a - lo) / scale * 255.0).astype('uint8'), 'L')
    out = np.asarray(img.filter(ImageFilter.GaussianBlur(sigma)), dtype=float) / 255.0
    return out * scale + lo


def _sstep(x):
    t = np.clip(x, 0.0, 1.0)
    return t * t * (3 - 2 * t)


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


def build(src_name, out_name):
    b = np.asarray(Image.open(os.path.join(PREP, src_name)).convert('RGBA')).astype(float)
    solid = b[..., 3] >= 128          # v20 的近白平板 alpha 仅 74~88，天然被排除
    rgb0 = b[..., :3]
    H, W = solid.shape

    sd = sdf(solid)
    # v20 的轮廓本身参差（v13/v19 反复改边遗留），直接沿用会得到锯齿/平切的下缘。
    # 改用「实测圆角半径 + 实体 bbox」重出一条光滑圆角矩形轮廓。
    radius = measure_radius(solid)
    rmask = rounded_mask(solid, radius)
    alpha = rmask        # 轮廓即 alpha（含 ~1px 连续抗锯齿，无台阶）

    yy, xx = np.mgrid[0:H, 0:W].astype(float)

    # 每列实体底缘、每行实体左缘（轴对齐，比法线稳）——用光滑轮廓 rmask 定位
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
    patch = body[by0 + int(bh * 0.45):by0 + int(bh * 0.65), bx0 + int(bw * 0.10):bx0 + int(bw * 0.25)]
    prgb = rgb0[by0 + int(bh * 0.45):by0 + int(bh * 0.65), bx0 + int(bw * 0.10):bx0 + int(bw * 0.25)]
    plate = np.median(prgb[patch], axis=0) if patch.sum() > 20 else np.median(rgb0[body], axis=0)

    db = np.where(ybot[None, :] >= 0, ybot[None, :] - yy, 1e6)     # 到底缘
    dl = np.where(xleft[:, None] >= 0, xx - xleft[:, None], 1e6)     # 到左缘

    # 左缘只在「已到最左」的行有效（否则是左上角曲线，不应染色）
    xmin = xleft[xleft >= 0].min()
    straight_l = (xleft[:, None] >= 0) & (xleft[:, None] <= xmin + 2.0) & (xleft[:, None] > 0)
    dl = np.where(straight_l, dl, 1e6)

    # 与底缘/左缘的加权距离：两向都远处权重为 0（上/右/内部不受影响）
    dmin = np.minimum(db, dl)
    w_b = _sstep((KB - db) / KB)
    w_l = _sstep((KB - dl) / KB)
    tot = w_b + w_l
    band = tot > 1e-3

    def color_at(c_table, dist):
        k = np.clip(dist, 0, 25)
        return np.stack([np.interp(k, np.arange(26), c_table[:, c],
                                   left=c_table[0, c], right=c_table[-1, c]) for c in range(3)], axis=-1)

    cb = color_at(BOT_C, db)
    cl = color_at(LFT_C, dl)
    ws = np.maximum(tot, 1e-6)[..., None]
    edge_c = (cb * w_b[..., None] + cl * w_l[..., None]) / ws

    # 带区颜色：参考实测**合成色** + 本 tile 板面色相对参考板面的偏移（保留各 tile 色相/明度差）。
    # v20 板面最外 ~6px 被 v13 洗白（实测边比面亮），所以这里直接**重绘**而非叠乘；
    # 物件落到带里的接触线会一并被压暗，正是参考稿里物件与板面接触处该有的暗棱。
    band_rgb = np.clip(edge_c + (plate - PLATE_RGB)[None, None, :], 0, 255)

    # 先把 v20 的透明/近白平板像素垫成板面色（v20 轮廓参差、外侧还有一块 alpha≈82 的
    # 近白平板），再统一在光滑轮廓内应用棱——否则参差边界会在板面上切出一块异色矩形。
    base0 = np.where(solid[..., None], rgb0, plate[None, None, :])

    # 带内重绘、带外保留 v20 原色；用权重软过渡，避免出现矩形接缝
    m = np.where(band, np.clip(tot, 0, 1), 0.0)[..., None]
    rgb_in = base0 * (1 - m) + band_rgb * m
    # 轮廓外垫浅色余晖，避免 AA 环合到页面时拉出暗晕
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


def main():
    for s, o in TILES.items():
        build(s, o)


if __name__ == '__main__':
    main()
