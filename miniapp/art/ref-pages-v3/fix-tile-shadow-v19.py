# -*- coding: utf-8 -*-
"""tile 第九轮（v19）：影色去冷灰污染——保留 v18 的几何与 alpha，只把影重新调暖。

用户反馈的残留问题（截图实测）：气球/公文包边缘有一圈**脏灰**，爱心/MBTI 没有。
根因（逐像素实测）：影是从参考 **star（雾蓝 tile）** 移植的，而参考紧贴实体那一格是
「蓝 clay × 影」的混色——通道比 = 1.171/0.969/0.860（红掉得最多），读作冷灰；
参考影的**本体**（d≥2）才是暖褐（0.762/0.964/1.274，蓝掉得最多）。把那一格直接搬过来，
暖色 tile 上就显出一圈灰。

做法：沿用 v18 的全部几何/alpha/合成逻辑（v18 的影厚与形已被确认正确），
只在「影侧」像素上按**压暗量 × 暖色比**重建颜色：
    color = 页面色 − (页面亮度 − 该处亮度) × (0.762, 0.964, 1.274)
影的深浅与形状完全不动，只把色相从冷灰纠正为暖褐。
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
REF_TILE = 'tile-love-v10.png'   # 橙色 tile：与气球/公文包同色系，阴影强度才是对的
TILES = {
    'tile-fun-v13.png': 'tile-fun-v19.png',
    'tile-career-v13.png': 'tile-career-v19.png',
}
SIGMA = 1.0
EDGE_RAMP = 1.8


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


def _ref_shadow(ref_path):
    a = np.asarray(Image.open(ref_path).convert('RGBA')).astype(float)
    A = a[..., 3]
    comp = a[..., :3] * (A[..., None] / 255.0) + PAGE * (1 - A[..., None] / 255.0)
    # 参考实体判据必须与影区分开：橙色 tile 的**影本身也是暖色**
    # （r-b=+26），用色相判据会把影并进实体、把影从层里剔掉。
    # 改用「与页面色的距离」——clay 离页面远（star 149 / love 116），
    # 影离页面近（star 77 / love 58），阈值 85 可干净分开。
    dist = np.sqrt(((comp - PAGE) ** 2).sum(axis=2))
    body = (dist > 85) & (A > 200)
    ys, xs = np.where(body)
    box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
    return box, np.where(body, 0.0, A), np.where(body[..., None], PAGE, comp)


def fix_tile(ref, name, out_name):
    (rx0, ry0, rx1, ry1), ref_a, ref_rgb = ref
    b = np.asarray(Image.open(os.path.join(SRC, name)).convert('RGBA')).astype(float)
    A0 = b[..., 3]
    body = A0 >= 200
    H, W = body.shape
    rgb = b[..., :3].copy()

    # ① 实体平滑 alpha（SDF 超采样）——与 v18 相同
    body_a = np.clip(_sdf_alpha(body) / EDGE_RAMP + 0.5, 0.0, 1.0)
    ys, xs = np.where(body)
    tx0, ty0, tx1, ty1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())

    # ② 边缘色：本体色归一化卷积外扩——与 v18 相同
    w = body.astype(float)
    den = np.asarray(Image.fromarray((w * 255).astype('uint8'), 'L')
                     .filter(ImageFilter.GaussianBlur(SIGMA)), dtype=float) / 255.0
    ext = np.zeros_like(rgb)
    for c in range(3):
        num = np.asarray(Image.fromarray((rgb[..., c] * w).astype('uint8'), 'L')
                         .filter(ImageFilter.GaussianBlur(SIGMA)), dtype=float)
        ext[..., c] = num / np.maximum(den, 1e-3)
    ext = np.clip(ext, 0, 255)

    # ③ 影：移植参考影层，只在左下方位——与 v18 相同
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
    shadow_side = ((col_bottom[None, :] >= 0) & (yy > col_bottom[None, :])) \
        | ((row_left[:, None] >= 0) & (xx < row_left[:, None]))

    u = (xx - tx0) / max(1, (tx1 - tx0))
    v = (yy - ty0) / max(1, (ty1 - ty0))
    sx = np.clip(np.rint(rx0 + u * (rx1 - rx0)).astype(int), 0, 171)
    sy = np.clip(np.rint(ry0 + v * (ry1 - ry0)).astype(int), 0, 171)
    take_shadow = (~body) & shadow_side
    sh_a = np.where(take_shadow, ref_a[sy, sx], 0.0) / 255.0

    # ④ 影色：直接沿用参考色。参考改用**橙色** tile 后，其影本身就是暖的
    #    （实测通道比 0.446/0.951/1.603，蓝掉得最多），不再需要重调暖。
    sh_rgb = np.where(take_shadow[..., None], ref_rgb[sy, sx], PAGE)

    # ⑤ src-over 合成：body over shadow
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
    m = take_shadow & (out_a > 0.3)
    if m.any():
        rb = (out_rgb[..., 0] - out_rgb[..., 2])[m]
        print(f'   影侧 r-b: 均值={rb.mean():+.1f} 最小={rb.min():+.1f}（负=冷灰，正=暖褐）')
    return res


def main():
    _ensure_base()
    os.makedirs(PREP, exist_ok=True)
    ref = _ref_shadow(os.path.join(HERE, '..', '..', 'src', 'assets', 'illus', REF_TILE))
    for name, out_name in TILES.items():
        fix_tile(ref, name, out_name)


if __name__ == '__main__':
    main()
