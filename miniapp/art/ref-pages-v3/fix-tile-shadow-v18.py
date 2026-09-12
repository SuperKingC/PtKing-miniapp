# -*- coding: utf-8 -*-
"""tile 第八轮（v18）：修边缘锯齿——用超采样圆角矩形的 alpha 替换基底那圈硬边。

用户反馈「阴影是对的了，但是感觉原图边缘没有扣干净，锯齿很严重」。实测根因在**基底**：
v13 的实体边缘是硬台阶（沿左上对角 alpha 为 …4 12 26 255，一格就从 26 跳到 255），
而参考稿是 2~3px 的连续过渡（…9 88 240 255）。v10 当年做软抠时用的阈值+0.8 高斯，
在圆角这种斜边上留下了明显阶梯；v17 又把体外整段替换成参考层，等于把这圈阶梯原样留着。

做法：实体轮廓本来就是圆角矩形（实测最小二乘拟合半径 fun=31 / career=35，
与 A>=200 掩膜的差集仅 59px / 240px，几乎完全重合），故
  ① 拟合圆角矩形 → 4x 超采样渲染 → 归一化得到**亚像素平滑的 alpha**，替换基底硬边；
  ② 边缘色用归一化卷积外扩的本体色（不再用 v13 那圈被洗白的 AA）；
  ③ 影沿用 v17 的移植方案（参考 star 的 baked 影层，按实体框归一化坐标映射），
     并改用**正确的不透明合成**（body over shadow），而不是逐像素取 max——
     取 max 会在体与影之间顶出一条硬色线。
"""
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'base')
PREP = os.path.join(HERE, 'prepared')
PAGE = np.array([254.0, 250.0, 244.0])
BASE_REV = '917a570'
REF_TILE = 'tile-star-v10.png'
TILES = {
    'tile-fun-v13.png': 'tile-fun-v18.png',
    'tile-career-v13.png': 'tile-career-v18.png',
}
SIGMA = 1.0          # 边缘取色的柔和半径
EDGE_RAMP = 1.8      # SDF 过渡带宽（px）；参考约 2~3px
SS = 4               # 圆角矩形超采样倍率


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


def _fit_radius(body):
    """在实体掩膜上拟合圆角矩形（半径 + 外接框），返回 (r, box)。"""
    ys, xs = np.where(body)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    H, W = body.shape
    best = None
    for r in range(2, 80):
        m = Image.new('L', (W * SS, H * SS), 0)
        ImageDraw.Draw(m).rounded_rectangle(
            (x0 * SS, y0 * SS, (x1 + 1) * SS - 1, (y1 + 1) * SS - 1), radius=r * SS, fill=255)
        mm = np.array(m.resize((W, H), Image.Resampling.BOX)) > 128
        diff = int((mm ^ body).sum())
        if best is None or diff < best[0]:
            best = (diff, r, (x0, y0, x1, y1))
    return best[1], best[2]


def _sdf_alpha(mask, ss=4):
    """超采样符号距离场 → 平滑 alpha（跟随真实轮廓，任何形状都不会出锯齿/空洞）。

    基底 alpha 是硬台阶（沿对角 …12 26 255），直接用它就是用户看到的锯齿。
    做法：把掩膜 4x 最近邻放大后算内外距离场，插值出亚像素边界，再按 4x4 取均值降回。
    比「拟合圆角矩形 + 超采样」稳：那要求轮廓是正圆弧，而 career 的圆角更接近方角，
    几何圆会切进实体、alpha 掉到 0 形成空洞。"""
    H, W = mask.shape
    big = np.repeat(np.repeat(mask, ss, 0), ss, 1)
    di = _bfs(big, ~big).astype(float)
    do = _bfs(~big, big).astype(float)
    signed = np.where(big, di - 0.5, -(do - 0.5)) / ss
    return signed.reshape(H, ss, W, ss).mean(axis=(1, 3))


def _bfs(region, other):
    """region 内每像素到 other 的最短步数（与 other 相邻记 1）。"""
    from collections import deque
    H, W = region.shape
    d = np.zeros((H, W), dtype=int)
    q = deque()
    for y in range(H):
        for x in range(W):
            if not region[y, x]:
                continue
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and other[ny, nx]:
                    d[y, x] = 1
                    q.append((y, x))
                    break
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and region[ny, nx] and d[ny, nx] == 0:
                d[ny, nx] = d[y, x] + 1
                q.append((ny, nx))
    return d


def _geo_alpha(body):
    """实体平滑 alpha（0..1）。"""
    r, box = _fit_radius(body)
    s = _sdf_alpha(body)
    a = np.clip(s / EDGE_RAMP + 0.5, 0.0, 1.0)
    return a, r, box


def _ref_shadow(ref_path):
    """参考稿的实体框 + 体外影层（alpha 与已合成到页面的颜色）。"""
    a = np.asarray(Image.open(ref_path).convert('RGBA')).astype(float)
    A = a[..., 3]
    comp = a[..., :3] * (A[..., None] / 255.0) + PAGE * (1 - A[..., None] / 255.0)
    body = (comp[..., 2] - comp[..., 0] > 12) & (A > 200)
    ys, xs = np.where(body)
    box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
    # 体外整层照搬（含影核与衰减）。注意参考左缘的影核本身是**低饱和灰蓝**
    # （实测 (164,170,169)，r-b=-5），并非暖褐——若按「暖色才留」过滤会把影核切掉，
    # 左缘首格压暗从 82 掉到 11。这里不筛颜色。
    return box, np.where(body, 0.0, A), np.where(body[..., None], PAGE, comp)


def fix_tile(ref, name, out_name):
    (rx0, ry0, rx1, ry1), ref_a, ref_rgb = ref
    b = np.asarray(Image.open(os.path.join(SRC, name)).convert('RGBA')).astype(float)
    A0 = b[..., 3]
    body = A0 >= 200
    H, W = body.shape
    rgb = b[..., :3].copy()

    # ---- ① 平滑实体 alpha（替换基底硬边）----
    body_a, radius, box = _geo_alpha(body)
    tx0, ty0, tx1, ty1 = box

    # ---- ② 边缘色：本体色归一化卷积外扩 ----
    w = body.astype(float)
    den = np.asarray(Image.fromarray((w * 255).astype('uint8'), 'L')
                     .filter(ImageFilter.GaussianBlur(SIGMA)), dtype=float) / 255.0
    ext = np.zeros_like(rgb)
    for c in range(3):
        num = np.asarray(Image.fromarray((rgb[..., c] * w).astype('uint8'), 'L')
                         .filter(ImageFilter.GaussianBlur(SIGMA)), dtype=float)
        ext[..., c] = num / np.maximum(den, 1e-3)
    ext = np.clip(ext, 0, 255)

    # ---- ③ 影：移植参考影层（按实体框归一化坐标），但只在**下/左**方位 ----
    # 参考体外那层混着两样东西：下/左是暖褐 baked 影（要移植），上/右是参考体自己的
    # 雾蓝 AA 环（属 star 的体边，搬到气球/公文包上会露灰蓝描边）。按侧别区分。
    col_bottom = np.full(W, -1, dtype=int)
    for x in range(W):
        col = np.where(body[:, x])[0]
        if len(col):
            col_bottom[x] = int(col.max())
    row_left = np.full(H, -1, dtype=int)
    for y in range(H):
        row = np.where(body[y, :])[0]
        if len(row):
            row_left[y] = int(row.min())
    yy, xx = np.mgrid[0:H, 0:W]
    shadow_side = ((col_bottom[None, :] >= 0) & (yy > col_bottom[None, :]))         | ((row_left[:, None] >= 0) & (xx < row_left[:, None]))

    u = (xx - tx0) / max(1, (tx1 - tx0))
    v = (yy - ty0) / max(1, (ty1 - ty0))
    sx = np.clip(np.rint(rx0 + u * (rx1 - rx0)).astype(int), 0, 171)
    sy = np.clip(np.rint(ry0 + v * (ry1 - ry0)).astype(int), 0, 171)
    take_shadow = (~body) & shadow_side
    sh_a = np.where(take_shadow, ref_a[sy, sx], 0.0) / 255.0
    sh_rgb = np.where(take_shadow[..., None], ref_rgb[sy, sx], PAGE)

    # ---- ④ 正确合成：body over shadow（逐像素 src-over，避免硬色线）----
    ba = body_a
    out_a = ba + sh_a * (1.0 - ba)
    safe = np.maximum(out_a, 1e-6)[..., None]
    out_rgb = (ext * ba[..., None] + sh_rgb * (sh_a * (1.0 - ba))[..., None]) / safe

    res = Image.fromarray(
        np.dstack([out_rgb, out_a * 255.0]).clip(0, 255).astype('uint8'), 'RGBA')
    res.save(os.path.join(PREP, out_name))

    comp = out_rgb * out_a[..., None] + PAGE * (1 - out_a[..., None])
    dark = np.clip(PAGE.mean() - comp.mean(axis=2), 0, None)
    bx0, bx1 = tx0 + (tx1 - tx0) // 4, tx1 - (tx1 - tx0) // 4
    cy = (ty0 + ty1) // 2
    print(f'{name} -> {out_name}  r={radius} 体面积={int(body.sum())}')
    print(f'   BOT outer d1..8: {[round(float(dark[ty1+d,bx0:bx1+1].mean()),1) for d in range(1,9)]}')
    print(f'   LFT outer d1..5: {[round(float(dark[cy,tx0-d]),1) for d in range(1,6)]}')
    print(f'   左上对角 alpha d=16..24: {[int(out_a[d,d]*255) for d in range(16,25)]}')
    print(f'   顶边 x86 alpha y=6..12: {[int(out_a[y,86]*255) for y in range(6,13)]}')
    return res


def main():
    _ensure_base()
    os.makedirs(PREP, exist_ok=True)
    ref = _ref_shadow(os.path.join(HERE, '..', '..', 'src', 'assets', 'illus', REF_TILE))
    print(f'参考实体框 {ref[0]}')
    for name, out_name in TILES.items():
        fix_tile(ref, name, out_name)


if __name__ == '__main__':
    main()
