# -*- coding: utf-8 -*-
"""tile 第十轮（v20）：去掉板面顶缘/右缘的**淡黄色受光带**。

用户反馈（截图实测）：气球与公文包边缘仍有一圈**淡黄**，爱心/星星/MBTI 没有。
根因（逐像素实测，本轮结论）：
  板面本身有一条色相渐变——顶缘 hue 40~48°（黄），板心 hue 18~22°（橙）。
  参考稿的顶缘只是**同色相提亮**（爱心顶缘 31~37° vs 板心 26°；星星 193° vs 200°），
  色相基本恒定。所以「淡黄边」是**原图受光面的偏黄光**，与切图/阴影无关
  （v13 原图同样存在：顶缘 44.3° vs 板心 23.6°）。

做法：只改色相、不动明暗——把板面像素的色相朝**板心色相**收（黄越重收得越多），
保持 S/V 不变，于是顶缘仍是「提亮的同色板面」，与参考稿一致。
用饱和度门（clay 板面 sat≥18，奶油物件 sat 5~14）把气球/公文包本体排除在外，
只重染板面。阴影、alpha、边缘抗锯齿逻辑全部沿用 v19。
"""
import os
import subprocess

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'base')
PREP = os.path.join(HERE, 'prepared')
PAGE = np.array([254.0, 250.0, 244.0])
BASE_REV = '917a570'
REF_TILE = 'tile-love-v10.png'   # 橙色 tile：与气球/公文包同色系
TILES = {
    'tile-fun-v13.png': 'tile-fun-v20.png',
    'tile-career-v13.png': 'tile-career-v20.png',
}
SIGMA = 1.0
EDGE_RAMP = 1.8
# 色相校正：hue 高出板心 2° 起收，10° 以上完全收平；饱和度 12~18 之间过渡
HUE_LO, HUE_HI = 2.0, 10.0
SAT_LO, SAT_HI = 12.0, 18.0


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


def _bfs(region, other):
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


def _sdf_alpha(mask, ss=4):
    """超采样符号距离场 → 平滑 alpha（跟随真实轮廓，无锯齿无洞）。"""
    H, W = mask.shape
    big = np.repeat(np.repeat(mask, ss, 0), ss, 1)
    di = _bfs(big, ~big).astype(float)
    do = _bfs(~big, big).astype(float)
    signed = np.where(big, di - 0.5, -(do - 0.5)) / ss
    return signed.reshape(H, ss, W, ss).mean(axis=(1, 3))


def _fit_radius(body):
    """拟合实体圆角半径（取直边段用）。"""
    from PIL import ImageDraw
    ys, xs = np.where(body)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    H, W = body.shape
    best = None
    for r in range(2, 80):
        m = Image.new('L', (W * 4, H * 4), 0)
        ImageDraw.Draw(m).rounded_rectangle(
            (x0 * 4, y0 * 4, (x1 + 1) * 4 - 1, (y1 + 1) * 4 - 1), radius=r * 4, fill=255)
        mm = np.array(m.resize((W, H), Image.Resampling.BOX)) > 128
        diff = int((mm ^ body).sum())
        if best is None or diff < best[0]:
            best = (diff, r)
    return best[1], None


def _ref_shadow(ref_path):
    a = np.asarray(Image.open(ref_path).convert('RGBA')).astype(float)
    A = a[..., 3]
    comp = a[..., :3] * (A[..., None] / 255.0) + PAGE * (1 - A[..., None] / 255.0)
    # 参考实体判据必须与影区分开：橙色 tile 的影本身也是暖色（r-b=+26），
    # 用色相判据会把影并进实体。改用「与页面色的距离」——clay 离页面远、
    # 影离页面近，阈值 85 可干净分开。
    dist = np.sqrt(((comp - PAGE) ** 2).sum(axis=2))
    body = (dist > 85) & (A > 200)
    ys, xs = np.where(body)
    box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
    return box, np.where(body, 0.0, A), np.where(body[..., None], PAGE, comp)


def _rgb_to_hsv(rgb):
    r, g, b = rgb[..., 0] / 255.0, rgb[..., 1] / 255.0, rgb[..., 2] / 255.0
    mx = np.max(rgb, axis=2) / 255.0
    mn = np.min(rgb, axis=2) / 255.0
    df = mx - mn
    saf = np.where(df == 0, 1.0, df)
    h = np.zeros_like(mx)
    m = (mx == r) & (df > 0)
    h[m] = ((g - b) / saf)[m] % 6
    m = (mx == g) & (df > 0)
    h[m] = ((b - r) / saf)[m] + 2
    m = (mx == b) & (df > 0)
    h[m] = ((r - g) / saf)[m] + 4
    s = np.where(mx == 0, 0.0, df / np.where(mx == 0, 1.0, mx))
    return h * 60.0, s * 100.0, mx * 100.0


def _hsv_to_rgb(h, s, v):
    c = v * s
    hp = (h / 60.0) % 6.0
    x = c * (1 - np.abs(hp % 2 - 1))
    z = np.zeros_like(c)
    r = np.select([hp < 1, hp < 2, hp < 3, hp < 4, hp < 5],
                  [c, x, z, z, x], default=c)
    g = np.select([hp < 1, hp < 2, hp < 3, hp < 4, hp < 5],
                  [x, c, c, x, z], default=z)
    b = np.select([hp < 1, hp < 2, hp < 3, hp < 4, hp < 5],
                  [z, z, x, c, c], default=x)
    m = v - c
    return np.dstack([r, g, b]) * 255.0 + m[..., None] * 255.0


def _smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def _plate_hue(rgb, body):
    """板心色相：取左侧板条（避开顶缘黄带、右侧黄带与下方阴影）里高饱和像素的中位。"""
    H, S, _ = _rgb_to_hsv(rgb)
    ys, xs = np.where(body)
    y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    m = np.zeros_like(body)
    m[y0 + 40:max(y0 + 41, y1 - 40), x0 + 6:max(x0 + 7, x0 + 40)] = True
    m &= body & (S >= 20)
    if m.sum() < 20:                       # 兜底：全板高饱和像素
        m = body & (S >= 20)
    return float(np.median(H[m]))


def _neutralize_plate_hue(rgb, body):
    """把板面色相朝板心收：黄越重收得越多；奶油物件靠饱和度门保护。"""
    H, S, V = _rgb_to_hsv(rgb)
    core = _plate_hue(rgb, body)
    dh = ((H - core + 180.0) % 360.0) - 180.0     # 带符号差，>0 表示更黄
    w = _smoothstep(HUE_LO, HUE_HI, dh) * _smoothstep(SAT_LO, SAT_HI, S)
    h_new = H - dh * w
    out = _hsv_to_rgb(h_new, np.clip(S, 0, 100) / 100.0, np.clip(V, 0, 100) / 100.0)
    return np.where(body[..., None], out, rgb), core


def fix_tile(ref, name, out_name):
    (rx0, ry0, rx1, ry1), ref_a, ref_rgb = ref
    b = np.asarray(Image.open(os.path.join(SRC, name)).convert('RGBA')).astype(float)
    A0 = b[..., 3]
    body = A0 >= 200
    H, W = body.shape
    rgb = b[..., :3].copy()

    # ⓪ 去板面淡黄受光带（本轮唯一新增）
    rgb, core = _neutralize_plate_hue(rgb, body)
    print(f'{name}: 板心色相={core:.1f}°')

    # ① 实体平滑 alpha（SDF 超采样）——与 v19 相同
    body_a = np.clip(_sdf_alpha(body) / EDGE_RAMP + 0.5, 0.0, 1.0)
    ys, xs = np.where(body)
    tx0, ty0, tx1, ty1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())

    # ② 边缘色：本体色归一化卷积外扩——与 v19 相同
    w = body.astype(float)
    den = np.asarray(Image.fromarray((w * 255).astype('uint8'), 'L')
                     .filter(ImageFilter.GaussianBlur(SIGMA)), dtype=float) / 255.0
    ext = np.zeros_like(rgb)
    for c in range(3):
        num = np.asarray(Image.fromarray((rgb[..., c] * w).astype('uint8'), 'L')
                         .filter(ImageFilter.GaussianBlur(SIGMA)), dtype=float)
        ext[..., c] = num / np.maximum(den, 1e-3)
    ext = np.clip(ext, 0, 255)

    # ③ 影：移植参考影层，只在左下方位、且只铺直边段——与 v19 相同
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
    rad = _fit_radius(body)[0]
    straight_v = (yy >= ty0 + rad) & (yy <= ty1 - rad)
    straight_h = (xx >= tx0 + rad) & (xx <= tx1 - rad)
    shadow_side = ((col_bottom[None, :] >= 0) & (yy > col_bottom[None, :]) & straight_h) \
        | ((row_left[:, None] >= 0) & (xx < row_left[:, None]) & straight_v)

    u = (xx - tx0) / max(1, (tx1 - tx0))
    v = (yy - ty0) / max(1, (ty1 - ty0))
    sx = np.clip(np.rint(rx0 + u * (rx1 - rx0)).astype(int), 0, 171)
    sy = np.clip(np.rint(ry0 + v * (ry1 - ry0)).astype(int), 0, 171)
    take_shadow = (~body) & shadow_side
    sh_a = np.where(take_shadow, ref_a[sy, sx], 0.0) / 255.0
    sh_rgb = np.where(take_shadow[..., None], ref_rgb[sy, sx], PAGE)

    # ④ src-over 合成：body over shadow
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
    print(f'{name} -> {out_name}')
    print(f'   BOT outer d1..8: {[round(float(dark[ty1+d,bx0:bx1+1].mean()),1) for d in range(1,9)]}')
    print(f'   LFT outer d1..5: {[round(float(dark[cy,tx0-d]),1) for d in range(1,6)]}')
    return res


def main():
    _ensure_base()
    os.makedirs(PREP, exist_ok=True)
    ref = _ref_shadow(os.path.join(HERE, '..', '..', 'src', 'assets', 'illus', REF_TILE))
    for name, out_name in TILES.items():
        fix_tile(ref, name, out_name)


if __name__ == '__main__':
    main()
