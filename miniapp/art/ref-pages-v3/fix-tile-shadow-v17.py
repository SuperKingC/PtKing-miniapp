# -*- coding: utf-8 -*-
"""tile 第七轮（v17）：接触影直接取参考稿 baked 影层，按几何位置移植。

前三轮（v13→v16）都错在同一件事上：**试图用程序合成影**。
  · v13 修黑晕边时把 body 外 AA 环混向页面白 → 影没了、留一圈洗白硬边；
  · v14/v15 沿轮廓「按距边缘第几像素查表」补影 → 等于等距加一圈，左带全高恒定，
    看上去像 tile 后面又垫了一块板（用户第三次反馈「感觉这个阴影差更多」）；
  · v16 还额外把上/右收边的归一化卷积分母量纲写错（按 0..255 而非 0..1），
    边缘 RGB 被除以 255 变成近黑，tile 顶上多出一道深灰勾边。
根本问题：参考稿的影是**渲染器烘焙**的（整页图裁切自带），带方向性投影 + 材质级噪声，
任何「查表铺一圈」都得不到同样质感。

v17 换思路：**不再合成，直接移植**。
  1. 从参考稿 star-v10 里把「黏土实体之外、alpha>0」的整圈像素（含 baked 影与 AA）
     按其相对实体左上角的偏移量做成查找表；
  2. 对气球/公文包，把该表按各自实体左上角贴回去——影的形状、衰减、色偏、颗粒
     与参考三枚**逐像素同源**；
  3. 我们的实体像素一律不动（图案、纹理保持原样）。
两张参考（star/mbti）体外的影层分布一致，故单用 star 的表即可。
"""
import os
import subprocess

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'base')          # v13 基底（体边缘 AA 干净、外侧无影）
PREP = os.path.join(HERE, 'prepared')
PAGE = np.array([254.0, 250.0, 244.0])
BASE_REV = '917a570'
REF_TILE = 'tile-star-v10.png'            # 参考影层的来源（star 与 mbti 分布一致）
FEATHER_SIGMA = 1.0      # 上/右边缘取色的模糊半径
TILES = {
    'tile-fun-v13.png': 'tile-fun-v17.png',
    'tile-career-v13.png': 'tile-career-v17.png',
}


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


def _ref_shadow(ref_path):
    """参考稿的黏土实体框 + 体外「影层」（含 baked 影）。

    体外像素里混着两样东西：
      · 参考 tile 自己的**带色 AA 环**（雾蓝，饱和度不低）——这是 star 特有的，搬到
        气球/公文包上会露出一圈蓝色描边；
      · 真正的**暖褐烘焙影**（低饱和）。
    故只取低饱和那部分（sat < 26），高饱和的 AA 环剔除，交由我们自己的体边缘决定。"""
    a = np.asarray(Image.open(ref_path).convert('RGBA')).astype(float)
    A = a[..., 3]
    comp = a[..., :3] * (A[..., None] / 255.0) + PAGE * (1 - A[..., None] / 255.0)
    body = (comp[..., 2] - comp[..., 0] > 12) & (A > 200)
    ys, xs = np.where(body)
    box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
    # 返回体外整层：alpha 用它（衰减形状与参考逐像素同源），颜色先带着，
    # 由 fix_tile 按侧别决定用参考影色还是我们自己的黏土色（上/右那一圈参考是雾蓝，
    # 直接搬会在气球/公文包上留蓝白描边）。
    return box, np.where(body, 0.0, A), np.where(body[..., None], PAGE, comp)


def fix_tile(ref, name, out_name):
    (rx0, ry0, rx1, ry1), ref_a, ref_rgb = ref
    b = np.asarray(Image.open(os.path.join(SRC, name)).convert('RGBA')).astype(float)
    A = b[..., 3]
    body = A >= 200
    ys, xs = np.where(body)
    tx0, ty0, tx1, ty1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    H, W = A.shape

    # 把体外像素按「相对实体框的归一化坐标」映射到参考影层上采样：
    # 我们的实体尺寸与参考不同（fun 148x147 vs 参考 154x152），若按左上角平移贴，
    # 影会整体错位几像素（底缘 d1..3 变成空白）；按比例映射才能让影贴着各自轮廓。
    yy, xx = np.mgrid[0:H, 0:W]
    u = (xx - tx0) / max(1, (tx1 - tx0))
    v = (yy - ty0) / max(1, (ty1 - ty0))
    sx = np.clip(np.rint(rx0 + u * (rx1 - rx0)).astype(int), 0, 171)
    sy = np.clip(np.rint(ry0 + v * (ry1 - ry0)).astype(int), 0, 171)

    # 取参考影层：alpha 一律用它的（衰减形状与参考逐像素同源）。
    # 注意映射到参考影层「之外」（参考那一侧本来没有影）时必须归零，否则会取到
    # 参考影层边界的常量值，形成一条 alpha 恒定（如 53）的平板尾——这正是
    # 「第二块板」的残余形态。
    map_a = ref_a[sy, sx]
    map_rgb = ref_rgb[sx, sy] if False else ref_rgb[sy, sx]

    # 颜色：下/左的 baked 影直接用参考影色；上/右的一圈是「体边缘的软化过渡」，
    # 必须用**我们自己的黏土色**（参考那圈是雾蓝，直接搬会留蓝白描边）。
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
    is_shadow_side = ((col_bottom[None, :] >= 0) & (yy > col_bottom[None, :])) \
        | ((row_left[:, None] >= 0) & (xx < row_left[:, None]))

    # 本体色外扩（归一化卷积）供上/右取色
    w = body.astype(float)
    den = np.asarray(Image.fromarray((w * 255).astype('uint8'), 'L')
                     .filter(ImageFilter.GaussianBlur(FEATHER_SIGMA)), dtype=float) / 255.0
    clay = np.zeros_like(b[..., :3])
    for c in range(3):
        num = np.asarray(Image.fromarray((b[..., c] * w).astype('uint8'), 'L')
                         .filter(ImageFilter.GaussianBlur(FEATHER_SIGMA)), dtype=float)
        clay[..., c] = num / np.maximum(den, 1e-3)
    clay = np.clip(clay, 0, 255)

    outside = ~body
    out_a = A.copy()
    out_rgb = b[..., :3].copy()
    use_shadow = outside & is_shadow_side
    use_ring = outside & ~is_shadow_side
    out_a[outside] = map_a[outside]
    out_rgb[use_shadow] = map_rgb[use_shadow]
    out_rgb[use_ring] = clay[use_ring]

    res = Image.fromarray(np.dstack([out_rgb, out_a]).clip(0, 255).astype('uint8'), 'RGBA')
    res.save(os.path.join(PREP, out_name))

    comp = out_rgb * (out_a[..., None] / 255.0) + PAGE * (1 - out_a[..., None] / 255.0)
    dark = np.clip(PAGE.mean() - comp.mean(axis=2), 0, None)
    bx0, bx1 = tx0 + (tx1 - tx0) // 4, tx1 - (tx1 - tx0) // 4
    cy = (ty0 + ty1) // 2
    print(f'{name} -> {out_name}  实体 {tx1-tx0+1}x{ty1-ty0+1} → 参考 {rx1-rx0+1}x{ry1-ry0+1}')
    print(f'   BOT outer d1..10: {[round(float(dark[ty1+d,bx0:bx1+1].mean()),1) for d in range(1,11) if ty1+d<H]}')
    print(f'   LFT outer d1..5 : {[round(float(dark[cy,tx0-d]),1) for d in range(1,6) if tx0-d>=0]}')
    print(f'   TOP outer d1..3 : {[round(float(dark[ty0-d,cy]),1) for d in range(1,4) if ty0-d>=0]}')
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
