# -*- coding: utf-8 -*-
"""tile 色调对齐参考稿：v7 资产整体偏暗偏灰、字母偏黄。

从原始 reference-ui.png（2496px）裁出三枚参考 tile（MBTI/heart/star），
与工程 v7 资产做分通道分位数匹配，拟合一条全局单调曲线（三 tile 量化后取中位），
应用到全部 5 枚 tile，升版 v8 输出到 src/assets/illus/。
"""
from PIL import Image
import numpy as np
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # miniapp/art
REF = os.path.join(ROOT, 'ref-pages-v3', 'reference-ui.png')
SRC_DIR = os.path.join(os.path.dirname(ROOT), 'src', 'assets', 'illus')

# 参考 tile 内部裁切（避开软边与接触影），(x0, y0, x1, y1)
REF_TILES = {
    'mbti': (108, 722, 252, 844),
    'love': (108, 940, 252, 1070),
    'star': (108, 1170, 248, 1294),
}
ASSETS = ['tile-mbti-v7.png', 'tile-love-v6.png', 'tile-star-v6.png', 'tile-career-v3.png', 'tile-fun-v7.png']
VERSION_MAP = {
    'tile-mbti-v7.png': 'tile-mbti-v8.png',
    'tile-love-v6.png': 'tile-love-v7.png',
    'tile-star-v6.png': 'tile-star-v7.png',
    'tile-career-v3.png': 'tile-career-v4.png',
    'tile-fun-v7.png': 'tile-fun-v8.png',
}


def face_pixels(img_arr, inset_ratio=0.16, alpha_min=200):
    """取画面中心区域不透明像素（避开外缘软边与烘焙接触影）。"""
    h, w = img_arr.shape[:2]
    ix, iy = int(w * inset_ratio), int(h * inset_ratio)
    crop = img_arr[iy:h - iy, ix:w - ix]
    if crop.shape[2] == 4:
        crop = crop[crop[:, :, 3] >= alpha_min][:, :3]
    return crop.reshape(-1, 3)


def quantile_lut(src_vals, dst_vals, lo=2, hi=250):
    """拟合 src->dst 的单调映射：17 个分位点的分段线性插值，端点线性延伸。"""
    qs = np.linspace(0.02, 0.98, 17)
    s = np.quantile(src_vals, qs)
    d = np.quantile(dst_vals, qs)
    lut = np.interp(np.arange(256), np.concatenate([[0], s, [255]]), np.concatenate([[d[0]], d, [255]]))
    return lut


def main():
    ref = np.asarray(Image.open(REF).convert('RGB'), dtype=np.uint8)
    ref_faces = {}
    for name, (x0, y0, x1, y1) in REF_TILES.items():
        ref_faces[name] = face_pixels(ref[y0:y1, x0:x1])
        print(f'ref {name}: mean #%02x%02x%02x' % tuple(int(v) for v in ref_faces[name].mean(axis=0)))

    luts = []
    for asset in ASSETS:
        path = os.path.join(SRC_DIR, asset)
        img = Image.open(os.path.join(SRC_DIR, asset)).convert('RGBA')
        arr = np.asarray(img, dtype=np.uint8)
        face = face_pixels(arr)
        print(f'{asset}: mean #%02x%02x%02x' % tuple(int(v) for v in face.mean(axis=0)))

    # 用三枚有参考目标的 tile 分别拟合并取中位曲线，保证整套统一
    for ch in range(3):
        per_tile = []
        for name, asset in [('mbti', 'tile-mbti-v7.png'), ('love', 'tile-love-v6.png'), ('star', 'tile-star-v6.png')]:
            img = Image.open(os.path.join(SRC_DIR, asset)).convert('RGBA')
            arr = np.asarray(img, dtype=np.uint8)
            src = face_pixels(arr)[:, ch]
            dst = ref_faces[name][:, ch]
            per_tile.append(quantile_lut(src, dst))
        luts.append(np.median(np.stack(per_tile), axis=0))

    for name, (x0, y0, x1, y1) in REF_TILES.items():
        pass

    os.makedirs(os.path.join(ROOT, 'ref-pages-v3', 'generated'), exist_ok=True)
    for asset in ASSETS:
        img = Image.open(os.path.join(SRC_DIR, asset)).convert('RGBA')
        arr = np.asarray(img, dtype=np.uint8).copy()
        rgb = arr[:, :, :3]
        alpha = arr[:, :, 3:]
        for ch in range(3):
            rgb[:, :, ch] = np.clip(luts[ch][rgb[:, :, ch]], 0, 255).astype(np.uint8)
        out = np.concatenate([rgb, alpha], axis=2)
        out_path = os.path.join(SRC_DIR, VERSION_MAP[asset])
        Image.fromarray(out, 'RGBA').save(out_path)
        after = face_pixels(out)
        print(f'-> {os.path.basename(out_path)}: mean #%02x%02x%02x' % tuple(int(v) for v in after.mean(axis=0)))


if __name__ == '__main__':
    main()
