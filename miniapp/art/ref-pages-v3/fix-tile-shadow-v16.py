# -*- coding: utf-8 -*-
"""tile 第六轮（v16）：按参考稿的实测剖面重做「本体边缘 + 外侧接触带」，与参考同质感。

前几轮为什么总差一口气（三处结构性差异，均已实测定位）：
1. **本体自己会变暗**。参考稿 star/mbti 沿实体下缘向内，亮度按 0.68→1.0 在约 12px 内回升
   （实测剖面见 INNER_BOTTOM）。我们的 v13 修黑晕边时把 body 边缘的 AA 环混向了页面白，
   于是最外几像素反而是**最亮**的（242，越往里越暗，方向颠倒），并在本体与影之间留出
   一条近白亮线——这就是「贴纸描灰边」而不是「厚黏土」的直接观感来源。
2. **外侧接触带的影色与不透明度**。参考稿外侧是「不透明暖褐带（约 9px）+ alpha 渐变收尾（约 5px）」，
   且 d1 是紧贴实体的**深核** (165,156,145)、d2 立刻跳到 (209,194,175)。v15 只补了亮度剖面、
   全程 alpha=255 到 d13 才硬切，尾部又几乎是页面白，合到异色卡面上会露一圈平板边。
3. 参考稿的影是**渲染器算出来的**（整页稿裁切），我们是「AI 平图 + 外贴影带」，所以永远差质感。

参考稿里没有气球/公文包（用户确认），无法裁切对齐，故本脚本按参考的**实测剖面重绘**：
以 917a570 的 v13 为几何基底（圆角/位置正确、外侧无 matte 暗环），
  ① 本体按 INNER_BOTTOM / INNER_LEFT 剖面重铺亮度（顺带抹掉 v13 的亮线）；
  ② 外侧按下/左方位铺 BAND_RGB + BAND_ALPHA（含 alpha 渐隐）。
两张表都取自参考稿 star+mbti 实测，确定性、可复跑。
"""
import os
import subprocess

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'base')          # v13 基底（从 git 取，一次性）
PREP = os.path.join(HERE, 'prepared')
PAGE = np.array([254.0, 250.0, 244.0])
BASE_REV = '917a570'
TILES = {
    'tile-fun-v13.png': 'tile-fun-v16.png',
    'tile-career-v13.png': 'tile-career-v16.png',
}

# ---- 参考稿实测表（star+mbti 平均；底部向外/向内）----
# 本体内部亮度剖面：d=0 紧贴实体边缘，向内递增到 1.0
INNER_BOTTOM = np.array([0.683, 0.768, 0.811, 0.847, 0.872, 0.909, 0.934,
                         0.959, 0.964, 0.977, 0.983, 0.995, 0.991, 1.000])
INNER_LEFT = np.array([0.815, 0.891, 0.923, 0.952, 0.982, 0.989, 1.000,
                       1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000])
# 外侧接触带（下缘）：d=1 紧贴实体边缘、向外；rgb + alpha 均取自参考实测
BAND_RGB = np.array([
    [165, 156, 145], [209, 194, 175], [213, 199, 180], [219, 207, 191],
    [225, 214, 198], [229, 219, 204], [234, 225, 213], [238, 231, 219],
    [241, 234, 224], [244, 238, 229], [247, 241, 232], [250, 245, 236],
    [252, 248, 240], [253, 249, 243],
], dtype=float)
BAND_ALPHA = np.array([255, 255, 255, 255, 255, 255, 255, 254, 253,
                       233, 174, 95, 39, 3], dtype=float)
BAND_REACH = len(BAND_RGB)      # 表尾 alpha 已近 0，超出即不再落影
# 外侧接触带（左缘）：参考实测压暗量 d1..7 = 84.5 42.4 36.0 29.0 23.4 18.0 11.0
# （参考稿左带被裁切窗 keep 蒙版截到 4~5px，其后按同族衰减比 ≈0.79 续算）。光从右上
# 打来，故左带比下带窄、衰减更快。表尾补零：带宽用尽后若被 clip 成常量，会在画布边缘留灰带。
LEFT_DARK = np.array([84.5, 42.4, 36.0, 29.0, 23.4, 18.0, 11.0,
                      6.5, 3.6, 1.9, 0.9, 0.4, 0.1, 0.0], dtype=float)
LEFT_ALPHA = np.array([255, 255, 255, 255, 255, 230, 120,
                       62, 30, 12, 5, 2, 0, 0], dtype=float)
# 影色通道权重（由参考影核 (165,156,145) 相对页面推得）
CH = np.array([0.947, 1.000, 1.053])
# 上缘/右缘的软收边：参考实测 star/mbti 上缘 alpha 约 248/211/122/59、右缘约 232/165/77/30，
# 即「本体色→页面白」在 3~4px 内过渡。v13 把这圈混成近白硬边，必须重做。
FEATHER_SIGMA = 1.1      # 上/右软收边的模糊半径（参考实测过渡约 3~4px）


def _ensure_base():
    if os.path.isdir(SRC) and all(os.path.exists(os.path.join(SRC, n)) for n in TILES):
        return
    os.makedirs(SRC, exist_ok=True)
    repo = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
    for name in TILES:
        rel = f'miniapp/src/assets/illus/{name}'
        blob = subprocess.run(['git', 'show', f'{BASE_REV}:{rel}'], capture_output=True, cwd=repo)
        if blob.returncode != 0 or not blob.stdout:
            raise SystemExit(f'取不到 {BASE_REV}:{rel}')
        with open(os.path.join(SRC, name), 'wb') as fh:
            fh.write(blob.stdout)


def _bfs_from_boundary(region, other, limit=40):
    """region 内像素到 other 的最短步数：与 other 相邻的 region 像素记 1，向内递增。

    只从两区域交界处播种。若用「未被同区完全包围」播种，画布边缘的像素也会被当成边界，
    影带会在底边处镜像折返。"""
    from collections import deque
    H, W = region.shape
    d = np.zeros((H, W), dtype=int)
    q = deque()
    for y in range(H):
        for x in range(W):
            if not region[y, x]:
                continue
            adj = False
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and other[ny, nx]:
                    adj = True
                    break
            if adj:
                d[y, x] = 1
                q.append((y, x))
    while q:
        y, x = q.popleft()
        if d[y, x] >= limit:
            continue
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and region[ny, nx] and d[ny, nx] == 0:
                d[ny, nx] = d[y, x] + 1
                q.append((ny, nx))
    return d


def _dist_inside(mask, limit=40):
    """mask 内每像素到边界的最短步数（最外圈=1，向内递增）。"""
    return _bfs_from_boundary(mask, ~mask, limit)


def _dist_outside(mask, limit=40):
    """mask 外每像素到边界的最短步数（紧贴外沿=1，向外递增）。"""
    return _bfs_from_boundary(~mask, mask, limit)




def _table(arr, d):
    return arr[np.clip(d - 1, 0, len(arr) - 1)] if arr.ndim == 1 else arr[np.clip(d - 1, 0, len(arr) - 1)]


def fix_tile(name, out_name):
    arr = np.asarray(Image.open(os.path.join(SRC, name)).convert('RGBA')).astype(float)
    A = arr[..., 3]
    body = A >= 200                       # 几何基底（v13 边缘已 AA，形状正确）
    H, W = body.shape
    d_in = _dist_inside(body)
    d_out = _dist_outside(body)

    rgb = arr[..., :3].copy()
    lum = rgb.mean(axis=2)

    # ---- ① 本体内部：按参考剖面重铺亮度（顺带抹掉 v13 的白亮线）----
    # 面部基准亮度 = 深度>12 的实体像素中位数
    deep = body & (d_in > 12)
    l_face = float(np.median(lum[deep])) if deep.any() else float(np.median(lum[body]))

    # 逐列底缘 / 逐行左缘（决定某个像素受哪一侧剖面）
    col_bottom = np.full(W, -1, dtype=int)
    for x in range(W):
        ys = np.where(body[:, x])[0]
        if len(ys):
            col_bottom[x] = int(ys.max())
    row_left = np.full(H, -1, dtype=int)
    for y in range(H):
        xs = np.where(body[y, :])[0]
        if len(xs):
            row_left[y] = int(xs.min())

    yy = np.arange(H)[:, None]
    xx = np.arange(W)[None, :]
    db = (col_bottom[None, :] - yy).astype(float)     # >=0 表示在底缘之上多少像素
    dl = (xx - row_left[:, None]).astype(float)       # >=0 表示在左缘之右多少像素
    mb = np.where(db >= 0, INNER_BOTTOM[np.clip(db.astype(int), 0, len(INNER_BOTTOM) - 1)], 1.0)
    ml = np.where(dl >= 0, INNER_LEFT[np.clip(dl.astype(int), 0, len(INNER_LEFT) - 1)], 1.0)
    mult = np.minimum(mb, ml)                          # 取更暗的一侧
    # 只在本体「近缘带」内替换亮度（v13 自带的边缘明暗不齐、还有一条近白亮线，
    # 必须替换而非叠加）；带外 mult 恒为 1.0，不参与修正，故图案/纹理不受影响。
    rim = ((db >= 0) & (db < len(INNER_BOTTOM))) | ((dl >= 0) & (dl < len(INNER_LEFT)))
    target_lum = l_face * mult
    rgb = np.clip(rgb + np.where(rim, target_lum - lum, 0.0)[..., None], 0, 255)

    # ---- ② 外侧：下缘/左缘铺接触带；上缘/右缘重做软收边 ----
    # v13 修黑晕边时把 body 外的 AA 环整体混向了页面白，形成一圈「洗白的硬边」。
    # 参考稿上/右是「本体色按 (1-alpha) 渐隐进页面」约 3~4px，故这两侧也要重做：
    # 取该像素最近的本体色，套参考实测 alpha 表。
    out = ~body
    below = (col_bottom[None, :] >= 0) & (yy > col_bottom[None, :])
    lefter = (row_left[:, None] >= 0) & (xx < row_left[:, None])

    # 本体色外扩（供 feather 取色）：逐次把已知颜色向 4 邻域未定像素传播
    bled = rgb.copy()
    known = body.copy()
    for _ in range(6):
        if known.all():
            break
        acc = np.zeros_like(bled)
        cnt = np.zeros(known.shape, dtype=float)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sk = np.roll(known, (dy, dx), axis=(0, 1))
            so = np.roll(bled, (dy, dx), axis=(0, 1))
            acc[sk] += so[sk]
            cnt[sk] += 1
        have = (~known) & (cnt > 0)
        bled[have] = acc[have] / cnt[have, None]
        known = known | have

    ds = np.clip(d_out.astype(int), 1, len(BAND_RGB))
    b_rgb = BAND_RGB[ds - 1]
    b_a = np.where(d_out <= len(BAND_ALPHA), BAND_ALPHA[ds - 1], 0.0)
    s = np.clip(d_out.astype(int), 1, len(LEFT_DARK))
    l_rgb = np.clip(PAGE[None, None, :] - LEFT_DARK[s - 1][..., None] * CH[None, None, :], 0, 255)
    l_a = np.where(d_out <= len(LEFT_ALPHA), LEFT_ALPHA[s - 1], 0.0)

    zone_b = out & below
    zone_l = out & lefter & ~below
    # 上缘/右缘（含圆角）不铺接触带，但要重做 v13 留下的「洗白硬边」：取最近的本体色，
    # 按一段平滑 alpha 斜坡化进页面。斜坡用**对轮廓掩膜做高斯**得到——直接拿阶梯状的
    # 距离查表会在斜边/圆角上留下锯齿；二值掩膜模糊后是连续过渡，天然抗锯齿。
    # 上缘/右缘（含圆角）不铺接触带，但要重做 v13 留下的「洗白硬边」：
    #   ① alpha 斜坡：对轮廓掩膜做高斯 → 连续过渡，天然抗锯齿；
    #   ② 边缘颜色：用**归一化卷积**把本体色平滑外扩。逐次 4 邻域传播（bled）会沿阶梯状
    #      掩膜取到「最近的本体像素」，斜边上颜色随之阶梯化，合成后就是一圈锯齿；
    #      归一化卷积（加权高斯/权重高斯）得到的是连续外扩，边缘干净。
    zone_f = out & ~below & ~lefter
    f_a = np.asarray(Image.fromarray((body * 255).astype('uint8'), 'L')
                     .filter(ImageFilter.GaussianBlur(FEATHER_SIGMA)), dtype=float)
    w = body.astype(float)
    den = np.asarray(Image.fromarray((w * 255).astype('uint8'), 'L')
                     .filter(ImageFilter.GaussianBlur(FEATHER_SIGMA)), dtype=float) / 255.0
    ext = np.zeros_like(rgb)
    for c in range(3):
        num = np.asarray(Image.fromarray((rgb[..., c] * w).astype('uint8'), 'L')
                         .filter(ImageFilter.GaussianBlur(FEATHER_SIGMA)), dtype=float)
        ext[..., c] = num / np.maximum(den * 255.0, 1e-3)
    edge_rgb = np.clip(ext, 0, 255)
    out_rgb = np.where(zone_b[..., None], b_rgb,
                       np.where(zone_l[..., None], l_rgb,
                                np.where(zone_f[..., None], edge_rgb, rgb)))
    out_a = np.where(zone_b, b_a, np.where(zone_l, l_a,
                    np.where(zone_f, f_a, A)))

    res = Image.fromarray(np.dstack([out_rgb, out_a]).clip(0, 255).astype('uint8'), 'RGBA')
    res.save(os.path.join(PREP, out_name))

    # ---- 核对：与参考剖面逐格比对 ----
    comp = out_rgb * (out_a[..., None] / 255.0) + PAGE * (1 - out_a[..., None] / 255.0)
    dark = np.clip(PAGE.mean() - comp.mean(axis=2), 0, None)
    newlum = comp.mean(axis=2)
    ys, xs = np.where(body)
    y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    bx0, bx1 = x0 + (x1 - x0) // 4, x1 - (x1 - x0) // 4
    cy = (y0 + y1) // 2
    print(f'{name} -> {out_name}  face_lum={l_face:.1f} band_px={int((zone_b|zone_l).sum())}')
    print(f'   BOT inner d0..7 lum: {[round(float(newlum[y1-d,bx0:bx1+1].mean()),1) for d in range(0,8)]}')
    print(f'   BOT outer d1..10   : {[round(float(dark[y1+d,bx0:bx1+1].mean()),1) for d in range(1,11) if y1+d<H]}')
    print(f'   LFT inner d0..4 lum: {[round(float(newlum[cy,x0+d]),1) for d in range(0,5)]}')
    return res


def main():
    _ensure_base()
    os.makedirs(PREP, exist_ok=True)
    for name, out_name in TILES.items():
        fix_tile(name, out_name)


if __name__ == '__main__':
    main()
