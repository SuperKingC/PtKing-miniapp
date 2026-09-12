# -*- coding: utf-8 -*-
"""今日推荐栏（hero-card）v10：清掉参考稿裁切带进来的「暖灰方块边」。

背景（2026-09-12 用户反馈「今日推荐栏下面和右边有一层很浅的方块边」）：
v9（`rebuild-hero-card-v9.py`）重切时残留两条缺陷，都在**面板外圈**：

1. `clean_residue` 的底缘只清 `0<alpha<200`，把参考稿页面影带里 alpha>=200
   的像素当成「面板实体」留下（y=307 上有 243 个 alpha>=200 的暖灰像素）；
   右缘只清 x>=670，x=669 的暖灰过渡线整条留下。
2. 随后的 RGB 修复阈值 `DARK_RGB=120`（三通道都 <120 才算无效）只认「残框
   清零后回填 alpha 的黑像素」；而这条暖灰残线 RGB 在 150-240，判为有效，
   于是原样留着。

暖灰（低饱和、比页面底亮）沿面板底/右贴一圈、又不跟面板圆角，页面上读作
一个 L 形「方块边」。左缘 x=0 也是同一来源的一条细线。

本脚本回到参考稿直裁源（git e5df4de 的 hero-card-v3.png，未升级永不删除），
在 v9 基础上只改两处：
- 清残框范围补全：底缘 y>=307 清掉**全部** alpha（不只 <200），云所在
  x>=466 保留；右缘 x>=669、左缘 x<=1 整列清掉。
- 残框处的 RGB：AA 重建后对「被清过、又拿回 alpha」的像素，一律用最近实体色
  补齐（覆盖暖灰与黑两类，不再只看 RGB<120）。核心内像素一概不动。

不二值化、不盖固定斜坡，保留 v9 跟随真实轮廓的多级过渡。

用法：python rebuild-hero-card-v10.py            # 缺 prepared/hero-ref-crop.png 时从 git 取 v3
      python rebuild-hero-card-v10.py --in <png>
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
PREP = os.path.join(HERE, 'prepared')
os.makedirs(PREP, exist_ok=True)

REF_CROP = os.path.join(PREP, 'hero-ref-crop.png')
GIT_COMMIT = 'e5df4de'
GIT_PATH = 'miniapp/src/assets/illus/hero-card-v3.png'

SS = 4                    # 超采样倍率
BLUR_AT_SS = 2.0          # 4x 空间下的高斯半径（≈0.5px@1x）
CORE_THR = 128            # 内容核心阈值
# 残框边界（实测）：面板实体右缘 x=668、下缘 y=306、左缘 x=1
RIGHT_CUT = 669           # x>=669：右缘暖灰过渡线
LEFT_KEEP = 1             # x<=1：左缘暖灰细线
BOTTOM_CUT = 307          # y>=307：底缘暖灰影带
CLOUD_X_MIN = 466         # 云（真实内容）从 x≈487 起，466 留安全边


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
    """清参考稿裁切带进来的残框：底缘暖灰影带 / 右缘暖灰过渡线 / 左缘暖灰细线。

    与 v9 的差别：底缘不再只清 alpha<200（那会漏掉 alpha>=200 的暖灰残像素），
    而是清掉全部 alpha；云所在的右下角保留。
    """
    a = arr.copy()
    al = a[..., 3]
    H, W = al.shape
    removed = {}

    # 右缘 x>=RIGHT_CUT：整条暖灰过渡线
    removed['right'] = int((al[:, RIGHT_CUT:] > 0).sum())
    al[:, RIGHT_CUT:] = 0

    # 左缘 x<=LEFT_KEEP：参考稿裁进来的暖灰细线
    removed['left'] = int((al[:, :LEFT_KEEP + 1] > 0).sum())
    al[:, :LEFT_KEEP + 1] = 0

    # 底缘 y>=BOTTOM_CUT：清掉全部残影，云（x>=CLOUD_X_MIN）保留
    strip = al[BOTTOM_CUT:, :]
    keep = np.zeros_like(strip, dtype=bool)
    keep[:, CLOUD_X_MIN:] = True
    removed['bottom'] = int((strip[~keep] > 0).sum())
    strip[~keep] = 0
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


def bleed_body_color(rgb, seed, iters=40):
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
    new_al = np.clip(np.where(core, al, aa), 0, 255)

    # 残框处 RGB 是参考稿的暖灰页面影（150-240，不是黑），v9 只修 RGB<120 漏掉了它。
    # 改为：清残框后核心之外、重新拿回 alpha 的像素，一律取最近本体色。
    rows = np.arange(H)[:, None] * np.ones((1, W), bool)
    cols = np.ones((H, 1), bool) * np.arange(W)[None, :]
    cleared = (cols >= RIGHT_CUT) | (cols <= LEFT_KEEP) | ((rows >= BOTTOM_CUT) & (cols < CLOUD_X_MIN))

    rgb = arr[..., :3]
    need = (~core) & (new_al > 0) & cleared
    if need.any():
        body = bleed_body_color(rgb, core)
        rgb = np.where(need[..., None], body, rgb)

    out = arr.copy()
    out[..., :3] = rgb
    out[..., 3] = new_al
    res = Image.fromarray(out.astype('uint8'), 'RGBA')
    return res, removed, len(np.unique(new_al.astype('uint8'))), int(need.sum())


if __name__ == '__main__':
    src = None
    if '--in' in sys.argv:
        src = sys.argv[sys.argv.index('--in') + 1]
    img = load_source(src)
    res, removed, levels, fixed_rgb = rebuild(img)
    dst = os.path.join(PREP, 'hero-card-v10.png')
    res.save(dst)
    print(f'residue cleared: {removed}')
    print(f'alpha levels: {levels}')
    print(f'residue RGB repaired: {fixed_rgb} px')
    print(f'saved {dst} ({os.path.getsize(dst)} bytes)')

    cream = Image.new('RGBA', res.size, (254, 250, 245, 255))
    cream.alpha_composite(res)
    rgb = cream.convert('RGB')
    rgb.save(os.path.join(HERE, '_hero10_preview.png'))
    for name, box in {
        '_hero10_bl': (0, 250, 120, 312),
        '_hero10_br': (540, 250, 675, 312),
        '_hero10_bottom': (100, 288, 470, 312),
        '_hero10_right': (640, 100, 675, 290),
    }.items():
        c = rgb.crop(box)
        c = c.resize(((box[2] - box[0]) * 8, (box[3] - box[1]) * 8), Image.NEAREST)
        c.save(os.path.join(HERE, f'{name}.png'))
    print('previews written')
