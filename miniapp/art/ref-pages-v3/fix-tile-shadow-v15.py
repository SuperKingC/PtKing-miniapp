# -*- coding: utf-8 -*-
"""tile 第五轮（v15）：补上 v14 丢失的**近缘接触核心**，影厚对齐参考稿。

v14 的问题（用户复反馈「还是没有其他 icon 阴影厚」）：
v14 的影剖面是从「alpha≥200 的 body 掩膜」量出来的，而这个掩膜把紧贴实体的
不透明核心并进了 body，于是整条曲线从第 2 格起算——**最厚的那一档整段丢失**，
影看起来只剩一层软晕，比参考稿薄一档。参考稿沿实体边缘的第一格压暗就有 ~94
（合成色 ~#a29588），v14 在那一格只有 ~56。

v15 做法：改用「色相/与页面距离」判据定实体边缘（把整片不透明接触影排除在 body 外），
量出含核心的完整剖面并按实测通道色重建；影只落在实体之外的左/下方位的某一格。

参考稿实测（实体边缘向外，单位=相对页面 #fefaf4 的压暗量）：
  下缘 d=1..13px：93.6 56.3 51.4 43.1 36.6 31.5 25.2 19.6 15.7 10.9 5.9 1.9 0.4
  左缘 d=1..5px ：80.9 41.0 35.5 28.5 22.9（左带被裁切窗 keep 蒙版截到 5px，
                  其后按 d≥6 沿同族衰减延续）
影核实测色 #a29588（162,149,136），即每单位压暗量的通道幅度 (92,101,108)/93.55。
"""
import os
import subprocess

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
# 基底是 v13（body 边缘 AA 干净、外侧无影）。v13 已从 src 升版替换，故从 git 取出其副本
# 到 base/（一次性、不入库）。若 src 里还有 v13 就直接用。
SRC = os.path.join(HERE, 'base')
PREP = os.path.join(HERE, 'prepared')
os.makedirs(PREP, exist_ok=True)


# v13 的两枚 tile 在 917a570 定稿（干净的 body 边缘 AA、外侧无影），此后被 v14/v15 升版
# 替换。这里直接按该修订取基底，避免用到更早那版还带 matting 暗环的 v13。
BASE_REV = '917a570'


def _ensure_base():
    """从 BASE_REV 取 v13 两枚 tile 到 base/（已存在则跳过）。"""
    if os.path.isdir(SRC) and all(os.path.exists(os.path.join(SRC, n)) for n in TILES):
        return
    os.makedirs(SRC, exist_ok=True)
    repo = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
    for name in TILES:
        rel = f'miniapp/src/assets/illus/{name}'
        blob = subprocess.run(['git', 'show', f'{BASE_REV}:{rel}'],
                              capture_output=True, cwd=repo)
        if blob.returncode != 0 or not blob.stdout:
            raise SystemExit(f'取不到 {BASE_REV}:{rel}，无法取 v13 基底')
        with open(os.path.join(SRC, name), 'wb') as fh:
            fh.write(blob.stdout)


PAGE = np.array([254.0, 250.0, 244.0])   # 页面/卡面白 #fefaf4
# 沿实体边缘向外的压暗剖面（d=1 为紧贴实体的接触核心）
REF_BOTTOM = np.array([93.55, 56.30, 51.35, 43.05, 36.55, 31.45,
                       25.15, 19.60, 15.65, 10.85, 5.90, 1.85, 0.40])
REF_LEFT = np.array([80.90, 41.00, 35.50, 28.45, 22.85,
                     19.50, 15.60, 12.20, 9.70, 6.70, 3.70, 1.15, 0.25])
CORE = np.array([162.0, 149.0, 136.0])        # 影核实测色
CH_SCALE = (PAGE - CORE) / REF_BOTTOM[0]      # 每单位压暗量的通道幅度
BODY_THR = 200
PAGE_DIST = 10.0                              # 与页面距离小于此值视为亮 AA 环（不算实体）
TILES = {
    'tile-fun-v13.png': 'tile-fun-v15.png',
    'tile-career-v13.png': 'tile-career-v15.png',
}


def _edges(body):
    """逐列底缘、逐行左缘（跟随实体轮廓）；无实体的列/行记 -1。"""
    H, W = body.shape
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
    return col_bottom, row_left


def fix_shadow(name, out_name):
    arr = np.asarray(Image.open(os.path.join(SRC, name)).convert('RGBA')).astype(float)
    A = arr[..., 3]
    comp0 = arr[..., :3] * (A[..., None] / 255.0) + PAGE * (1 - A[..., None] / 255.0)
    # 实体 = 不透明且明显偏离页面色（把整片不透明接触影与亮 AA 环都排除在外）
    body = (A >= BODY_THR) & (np.sqrt(((comp0 - PAGE) ** 2).sum(axis=2)) > PAGE_DIST)
    H, W = A.shape
    col_bottom, row_left = _edges(body)

    yy = np.arange(H)[:, None]
    xx = np.arange(W)[None, :]
    outside = ~body
    db = (yy - col_bottom[None, :]).astype(float)
    vb = outside & (col_bottom[None, :] >= 0) & (db >= 1) & (db <= len(REF_BOTTOM))
    ib = np.clip(db.astype(int), 1, len(REF_BOTTOM)) - 1
    sb = np.where(vb, REF_BOTTOM[ib], 0.0)
    dl = (row_left[:, None] - xx).astype(float)
    vl = outside & (row_left[:, None] >= 0) & (dl >= 1) & (dl <= len(REF_LEFT))
    il = np.clip(dl.astype(int), 1, len(REF_LEFT)) - 1
    sl = np.where(vl, REF_LEFT[il], 0.0)

    # 左/下取较强者（左下相接处取近缘者，避免叠影过深）
    strength = np.where(sb >= sl, sb, sl)

    shadow_rgb = np.clip(PAGE[None, None, :] - CH_SCALE[None, None, :] * strength[..., None], 0, 255)
    use = strength > 0.4
    out_rgb = np.where(use[..., None], shadow_rgb, arr[..., :3])
    out_a = np.where(use, 255.0, A)
    out = np.dstack([out_rgb, out_a]).clip(0, 255).astype('uint8')
    Image.fromarray(out, 'RGBA').save(os.path.join(PREP, out_name))

    comp = out_rgb * (out_a[..., None] / 255.0) + PAGE * (1 - out_a[..., None] / 255.0)
    dark = np.clip(PAGE.mean() - comp.mean(axis=2), 0, None)
    ys, xs = np.where(body)
    y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    bx0, bx1 = x0 + (x1 - x0) // 4, x1 - (x1 - x0) // 4
    cy = (y0 + y1) // 2
    bot = [round(float(dark[y1 + d, bx0:bx1 + 1].mean()), 1) for d in range(1, 9)]
    left = [round(float(dark[cy, x0 - d]), 1) for d in range(1, 6)]
    print(f'{name} -> {out_name}  band px={int(use.sum())}')
    print(f'   bottom d1..: {bot}')
    print(f'   ref    d1..: {[round(float(v), 1) for v in REF_BOTTOM[:8]]}')
    print(f'   left   d1..: {left}')
    print(f'   ref    d1..: {[round(float(v), 1) for v in REF_LEFT[:5]]}')
    return out


def main():
    _ensure_base()
    for name, out_name in TILES.items():
        fix_shadow(name, out_name)


if __name__ == '__main__':
    main()
