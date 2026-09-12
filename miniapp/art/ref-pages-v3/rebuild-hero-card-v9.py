# -*- coding: utf-8 -*-
"""今日推荐栏（hero-card）重切：回到参考稿直裁源，清残框并重建抗锯齿 alpha。

背景（2026-09-12 用户反馈「根据参考图重新切，注意不要有锯齿」）：
用户三页参考稿 reference-ui.png 已不在盘上（gitignore 未入库），但它的**直裁产物**
仍在 git 里：e5df4de 的 hero-card-v3.png（675x312，alpha 64 级，真彩边缘）。
v3 之后 v5→v8 一路「修」：v5 清残框、v6 超采样软 alpha、v7 按 solid>=200 二值化、
v8 再给每列底缘盖一条固定斜坡 [235,120,36,0]。其中 v7 的二值化把真彩边缘压成
1px 台阶（alpha 级数 64→16），v8 的固定斜坡不跟真实轮廓，页面上就是锯齿与硬线。

本脚本做两件事：
1. 清掉 v3 里从参考稿裁切带进来的「残框」——右缘 x>=670 的暖灰条（alpha~8-37）、
   左缘 x=0 的暖灰实线、底缘 y>=307 的暖灰影带（alpha<200）。
2. **重建外轮廓的抗锯齿**：对内容核心（清残框后 alpha>=128）做 4x 超采样再降采样，
   得到跟随真实轮廓的多级过渡场 aa；alpha 重建规则 = 核心内保留原值（烘焙软影/
   体积一概不动）、核心外一律取 aa。关键：清掉残框的像素原值是 0，若用 min(原值, aa)
   会把该处的 AA 也抹成 0（底缘就只剩 247→0 一跳），故必须按 core 内外分区取值。
   不二值化、不盖固定斜坡。

用法：python rebuild-hero-card-v9.py            # 缺 prepared/hero-ref-crop.png 时从 git 取 v3
      python rebuild-hero-card-v9.py --in <png>
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
PREP = os.path.join(HERE, 'prepared')
os.makedirs(PREP, exist_ok=True)

# 参考稿直裁源：git 里 e5df4de 的 hero-card-v3.png（未升级，永不删除）
REF_CROP = os.path.join(PREP, 'hero-ref-crop.png')
GIT_COMMIT = 'e5df4de'
GIT_PATH = 'miniapp/src/assets/illus/hero-card-v3.png'

SS = 4                    # 超采样倍率
BLUR_AT_SS = 2.0          # 4x 空间下的高斯半径（≈0.5px@1x）：过渡跨约 1.5px，
                          # 与参考稿自己的 α 剖面同宽，缩小后圆润无台阶
CORE_THR = 128            # 内容核心阈值：清残框后重新取 core
RIGHT_CUT = 670           # x>=670 为右缘残框
BOTTOM_CUT = 307          # y>=307 为底缘残框（保留 alpha>=200 的实体）
BOTTOM_KEEP = 200
DARK_RGB = 120            # RGB 三通道都低于此值视为「无效深色」，由本体色补齐


def load_source(explicit):
    if explicit:
        return Image.open(explicit).convert('RGBA')
    if not os.path.exists(REF_CROP):
        print(f'extracting reference crop from git {GIT_COMMIT}:{GIT_PATH}')
        blob = subprocess.run(
            ['git', 'show', f'{GIT_COMMIT}:{GIT_PATH}'],
            cwd=HERE, capture_output=True, check=True,
        ).stdout
        with open(REF_CROP, 'wb') as f:
            f.write(blob)
    return Image.open(REF_CROP).convert('RGBA')


def clean_residue(arr):
    """清参考稿裁切带进来的残框：右缘暖灰条 / 左缘暖灰实线 / 底缘暖灰影带。"""
    a = arr.copy()
    al = a[..., 3]
    H, W = al.shape
    removed = {}

    # 右缘 x>=670：整条暖灰残框（参考稿面板右边界在 x668-669）
    n = int((al[:, RIGHT_CUT:] > 0).sum())
    al[:, RIGHT_CUT:] = 0
    removed['right'] = n

    # 左缘 x=0：从参考稿裁进来的暖灰实体线，面板蓝从 x1 起
    n = int((al[:, 0] > 0).sum())
    al[:, 0] = 0
    removed['left'] = n

    # 底缘 y>=307：只留 alpha>=200 的实体（面板底缘与云），清掉半透明灰影带
    strip = al[BOTTOM_CUT:, :]
    m = (strip > 0) & (strip < BOTTOM_KEEP)
    removed['bottom'] = int(m.sum())
    strip[m] = 0
    al[BOTTOM_CUT:, :] = strip

    a[..., 3] = al
    return a, removed


def aa_contour(core, w, h):
    """对二值 core 做超采样抗锯齿，返回 0..255 过渡场（跟随真实轮廓）。"""
    up = Image.fromarray((core * 255).astype('uint8'), 'L').resize(
        (w * SS, h * SS), Image.Resampling.NEAREST
    )
    if BLUR_AT_SS > 0:
        up = up.filter(ImageFilter.GaussianBlur(BLUR_AT_SS))
    return np.array(up.resize((w, h), Image.Resampling.LANCZOS), dtype=float)


def bleed_body_color(rgb, seed, iters=8):
    """把 seed 区颜色迭代外扩，供外圈像素取用（纯 numpy，避免 scipy 依赖）。"""
    out = rgb.copy()
    known = seed.copy()
    for _ in range(iters):
        if known.all():
            break
        acc = np.zeros_like(out)
        cnt = np.zeros(known.shape, dtype=float)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sk = np.roll(known, (dy, dx), axis=(0, 1))
            so = np.roll(out, (dy, dx), axis=(0, 1))
            acc[sk] += so[sk]
            cnt[sk] += 1
        have = (~known) & (cnt > 0)
        out[have] = acc[have] / cnt[have, None]
        known = known | have
    return out


def rebuild(src_img):
    arr = np.array(src_img).astype(float)
    H, W = arr.shape[:2]
    arr, removed = clean_residue(arr)
    al = arr[..., 3]

    core = al >= CORE_THR
    aa = aa_contour(core, W, H)

    # 核心内保留原 alpha（内部烘焙软影原样不动）；核心外一律取 AA 过渡场。
    # 不能用 min(原值, aa)：残框处原值已被清成 0，会把该处 AA 一起抹掉。
    new_al = np.where(core, al, aa)
    new_al = np.clip(new_al, 0, 255)

    # 残框清零后那些像素 RGB 仍是 (0,0,0)：AA 给回 alpha 会合成出黑灰细边
    # （同 917a570 的 tile 黑晕）。只对「核心之外、新获得 alpha、RGB 明显无效」
    # 的像素用最近本体色补齐；核心内的深色内容（猫眼等）与参考稿软边一概不动。
    rgb = arr[..., :3]
    invalid = (~core) & (new_al > 0) & (rgb.max(axis=2) < DARK_RGB)
    if invalid.any():
        bled = bleed_body_color(rgb, core)
        rgb = np.where(invalid[..., None], bled, rgb)

    out = arr.copy()
    out[..., :3] = rgb
    out[..., 3] = new_al
    res = Image.fromarray(out.astype('uint8'), 'RGBA')
    return res, removed, len(np.unique(new_al.astype('uint8'))), int(invalid.sum())


if __name__ == '__main__':
    src = None
    if '--in' in sys.argv:
        src = sys.argv[sys.argv.index('--in') + 1]
    img = load_source(src)
    res, removed, levels, fixed_rgb = rebuild(img)
    dst = os.path.join(PREP, 'hero-card-v9.png')
    res.save(dst)
    print(f'residue cleared: {removed}')
    print(f'alpha levels: {levels}')
    print(f'dark-RGB repaired: {fixed_rgb} px')
    print(f'saved {dst} ({os.path.getsize(dst)} bytes)')

    # 预览：奶油底合成 + 四角 8x 放大
    cream = Image.new('RGBA', res.size, (254, 250, 245, 255))
    cream.alpha_composite(res)
    rgb = cream.convert('RGB')
    rgb.save(os.path.join(HERE, '_hero9_preview.png'))
    for name, box in {
        '_hero9_tl': (0, 80, 70, 150),
        '_hero9_bl': (0, 250, 100, 312),
        '_hero9_br': (580, 240, 675, 312),
        '_hero9_bottom': (150, 288, 400, 312),
    }.items():
        c = rgb.crop(box)
        c = c.resize(((box[2] - box[0]) * 8, (box[3] - box[1]) * 8), Image.NEAREST)
        c.save(os.path.join(HERE, f'{name}.png'))
    print('previews written')
