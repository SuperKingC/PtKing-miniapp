# -*- coding: utf-8 -*-
"""用户四项图标/插画边缘质量修复（2026-09-12）。

分三个独立子命令，产物写 prepared/，再由 compress 脚本压进 src/assets/illus：

1. tiles：气球(tile-fun)/公文包(tile-career) 的 alpha 边缘是硬阶梯
   （实测边缘一列 alpha 从 90 跳到 249，肉眼即锯齿）。做法=只在「实心核心
   外的一圈」重建平滑 alpha：先取 alpha>=200 的实心核心，向下采样-上采样
   平滑过渡带，核心内部一律 255 不动，核心外按原 alpha 做 1px 软化。
2. banner：品牌栏几何蒙版把参考稿的页面浅色边带一起保留，页面底色上呈
   「外圈白方块/白描边」。做法=圆角蒙版整体内缩 6px + 2px 羽化，切掉裁切
   窗边缘的浅色页带与暗色缘，只留面板本体。
3. hero：今日推荐卡底缘 alpha 阶梯（末行 alpha 在 x 方向 83..165 抖动、
   逐行错位 5px），做法=以实心核心为准重建一条水平底边，过渡带按原 alpha
   软化，核心外清零。
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'src', 'assets', 'illus')
PREP = os.path.join(HERE, 'prepared')
os.makedirs(PREP, exist_ok=True)


def neighbor_expand(mask):
    """4 邻域膨胀一圈（纯 numpy，无 scipy 依赖）"""
    out = np.zeros_like(mask)
    out[1:, :] |= mask[:-1, :]
    out[:-1, :] |= mask[1:, :]
    out[:, 1:] |= mask[:, :-1]
    out[:, :-1] |= mask[:, 1:]
    return out


def smooth_edge_alpha(al, body_thr=200, blur_r=1.1):
    """预乘 alpha 高斯平滑：边缘 0→255 的单像素跳变摊成 2-3px 渐变，
    面板本体（原 alpha>=body_thr）锁回 255 保持 crisp，烘焙接触影随之变柔。"""
    return al  # 占位，实际用 smooth_tile 处理整张 RGBA


def smooth_tile(im, body_thr=200, pad=1.0):
    """tile 本体是几何圆角方块，但右/上边缘是硬切（alpha 250 直接跳 0，无抗锯齿）。
    做法：以实心本体（alpha>=body_thr）外接框重建 4x 超采样圆角矩形蒙版，
    本体区一律用新蒙版（干净 AA 边），本体外的烘焙接触影保留原 alpha 并轻羽化。"""
    arr = np.array(im).astype(float)
    al = arr[..., 3]
    body = al >= body_thr
    ys, xs = np.where(body)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    # 圆角半径：从本体顶行起，逐行看最左实心是否已到 x0
    radius = 0
    for dy in range(0, 80):
        row = np.where(body[y0 + dy])[0]
        if len(row) and row.min() <= x0:
            radius = dy
            break
    w, h = x1 - x0 + 1, y1 - y0 + 1
    ss = 4
    mask = Image.new('L', (im.width * ss, im.height * ss), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle(
        (x0 * ss, y0 * ss, (x1 + 1) * ss - 1, (y1 + 1) * ss - 1),
        radius=max(2, radius) * ss, fill=255,
    )
    body_mask = np.array(mask.resize(im.size, Image.Resampling.LANCZOS), dtype=float)
    # 本体区用新蒙版（干净 AA 边），本体外保留原接触影 alpha（不做溢出模糊，避免右侧冒出灰边）
    outside = np.where(body, 0.0, al)
    final = np.maximum(body_mask, outside)
    arr[..., 3] = np.clip(final, 0, 255)
    return Image.fromarray(arr.clip(0, 255).astype('uint8'), 'RGBA')


def fix_tile(name, out_name):
    im = Image.open(os.path.join(SRC, name)).convert('RGBA')
    res = smooth_tile(im)
    res.save(os.path.join(PREP, out_name))
    al0 = np.array(im)[..., 3].astype(int)
    al1 = np.array(res)[..., 3].astype(int)
    print(f'{name} -> {out_name}: max step {int(np.abs(np.diff(al0,axis=1)).max())} -> {int(np.abs(np.diff(al1,axis=1)).max())}')
    return res


def fix_banner(src_name, out_name, inset=6, feather=2.0, radius_ratio=0.19):
    im = Image.open(os.path.join(SRC, src_name)).convert('RGBA')
    w, h = im.size
    # 原圆角半径按高比例估：参考稿 82px / 820px 高 ≈ 0.10，成品裁切按有效半径反推
    radius = int(round(h * radius_ratio))
    ss = 4
    mask = Image.new('L', (w * ss, h * ss), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle(
        (inset * ss, inset * ss, w * ss - 1 - inset * ss, h * ss - 1 - inset * ss),
        radius=max(2, radius - inset) * ss, fill=255,
    )
    mask = mask.resize((w, h), Image.Resampling.LANCZOS)
    if feather > 0:
        mask = mask.filter(ImageFilter.GaussianBlur(feather))
    arr = np.array(im)
    arr[..., 3] = np.minimum(arr[..., 3], np.array(mask))
    res = Image.fromarray(arr, 'RGBA')
    res.save(os.path.join(PREP, out_name))
    print(f'{src_name} -> {out_name}: inset {inset}, feather {feather}, radius {radius}')
    return res


def fix_hero(src_name, out_name):
    """底缘重建直边：取实心核心在每列的底界，统一到其分位数当底边，过渡带软化。"""
    im = Image.open(os.path.join(SRC, src_name)).convert('RGBA')
    arr = np.array(im)
    al = arr[..., 3].astype(int)
    H, W = al.shape
    solid = al >= 200
    # 每列实心底界；无实心的列跳过
    bottoms = np.array([np.where(solid[:, x])[0].max() if solid[:, x].any() else -1 for x in range(W)])
    valid = bottoms[bottoms > 0]
    edge = int(np.percentile(valid, 55))  # 取略偏上的稳定底边，切掉参差的外凸
    # 底边以下：先清零，再给边缘 1px 过渡（保留原 alpha 作抗锯齿）
    out = al.copy()
    for x in range(W):
        b = bottoms[x]
        if b < 0:
            continue
        # 实心核心保留
        out[edge, x] = 255
        # edge+1 行：用原 alpha（若存在）作过渡，其余清零
        if edge + 1 < H:
            out[edge + 1, x] = min(255, int(al[edge + 1, x] * 0.7)) if al[edge + 1, x] > 0 else 0
        out[edge + 2:, x] = 0
        # edge 之上若原来有 >edge 的内容（罕见）压回
        for y in range(edge + 2, b + 1):
            out[y, x] = 0
    # 平滑底缘
    out_img = Image.fromarray(out.astype('uint8'), 'L').filter(ImageFilter.GaussianBlur(0.5))
    out = np.array(out_img).astype(int)
    out[solid] = 255
    arr[..., 3] = out.clip(0, 255).astype('uint8')
    res = Image.fromarray(arr, 'RGBA')
    res.save(os.path.join(PREP, out_name))
    print(f'{src_name} -> {out_name}: straight bottom at y={edge}')
    return res


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if cmd in ('tiles', 'all'):
        fix_tile('tile-fun-v12.png', 'tile-fun-v13.png')
        fix_tile('tile-career-v12.png', 'tile-career-v13.png')
    if cmd in ('banner', 'all'):
        fix_banner('me-banner-panel-v4.png', 'me-banner-panel-v5.png')
    if cmd in ('hero', 'all'):
        fix_hero('hero-card-v7.png', 'hero-card-v8.png')
