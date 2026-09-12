# -*- coding: utf-8 -*-
"""tile 第四轮（v14）：恢复气球/公文包的左+下方向性接触影。

用户反馈：测试条里气球与公文包的阴影应「像其他 icon 一样在左边和下面」。

根因（参考稿 vs v13 逐像素实测）：
- 参考稿 star/love/mbti 是整页裁切，带一块**不透明烘焙接触影**，沿实体左缘与
  下缘锚定、按指数衰减向外淡出。实测（亮度相对页面 #fefaf4 的压暗量，取中线带均值）：
      下缘 d=1..12px：57.3 52.0 44.0 36.7 32.7 24.7 19.0 15.2 10.3 5.6 1.9 0.4
      左缘 d=1..4px ：42.3 35.9 28.9 23.4（裁切窗左侧只留 4px，故被硬切）
  两者逐像素衰减比都≈0.85 → 同一 λ≈6.2px 指数带；下缘振幅 57、左缘 42（上/右为 0）。
  影色是暖褐：每单位压暗量约为 (0.78, 0.98, 1.24)×均值，即蓝通道压得最多。
- v13 修黑晕边时，把**body 外全部像素**的 RGB 按 (1-alpha) 混向页面白——
  连带把烘焙影的暗 RGB 也洗成了近页面色，影就没了（实测 v13 下缘 d=1 只剩 5.3、
  左缘 1.8，比参考低约一个数量级）。v13 的价值是 body 边缘 AA 干净（无 matting 黑环），
  这部分必须保留。

v14 做法：以 v13 为基底，只在 body 外的左/下方位**重新烘焙**同款指数影带
（body 边缘 AA 原样不动，上/右不落影），振幅/衰减/色偏对齐参考稿实测值。
产物写 prepared/，再由 compress-tiles-v14.mjs 走 TinyPNG 落 src/assets/illus 并升版。
"""
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'src', 'assets', 'illus')
PREP = os.path.join(HERE, 'prepared')
os.makedirs(PREP, exist_ok=True)

PAGE = np.array([254.0, 250.0, 244.0])   # 卡面/页面白 #fefaf4
# 参考稿 star-v10（整页裁切、影已烘焙）沿下缘实测的影剖面，d=1..12px：
#   通道压暗量（已按 alpha 折算回影本体）
REF_BOTTOM = np.array([57.3, 52.0, 44.0, 36.7, 32.7, 24.7, 19.0, 15.4, 11.3, 8.4, 5.2, 2.4])
REF_ALPHA = np.array([255, 255, 255, 255, 255, 255, 255, 253, 232, 170, 93, 42]) / 255.0
# 左缘实测 d=1..4：42.3 35.9 28.9 23.4，与下缘同形、振幅比 0.738。
# 注意：参考稿裁切窗在实体左缘只留 4px，左带被管道 keep 蒙版硬切，4px 是裁切产物、
# 不是设计宽度；故左带取 6px 并给外圈 2px 软淡出，避免拼贴式硬边。
LEFT_RATIO = 42.3 / 57.3
LEFT_REACH = 6
LEFT_ALPHA = np.array([1.0, 1.0, 1.0, 1.0, 0.66, 0.34])
# 每单位压暗量的通道权重：蓝压得最多（暖褐影）
TINT = np.array([0.78, 0.98, 1.24])
BODY_THR = 200                            # body 判定
TILES = {
    'tile-fun-v13.png': 'tile-fun-v14.png',
    'tile-career-v13.png': 'tile-career-v14.png',
}


def _profile(band):
    """沿中线带报告 d=1..N 的压暗量均值（核对用）。"""
    return [round(float(band[i]), 1) for i in range(min(len(band), 12))]


def fix_shadow(name, out_name):
    im = Image.open(os.path.join(SRC, name)).convert('RGBA')
    arr = np.asarray(im).astype(float)
    A = arr[..., 3]
    body = A >= BODY_THR
    H, W = body.shape

    # 逐列 body 底缘、逐行 body 左缘（跟随圆角轮廓）
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

    strength = np.zeros((H, W), dtype=float)   # 影本体压暗量
    alpha_s = np.zeros((H, W), dtype=float)    # 影带不透明度 0..1
    yy = np.arange(H)[:, None]
    xx = np.arange(W)[None, :]
    # 下缘：像素在第 x 列 body 底缘之下 d 像素
    db = (yy - col_bottom[None, :]).astype(float)
    valid_b = (~body) & (col_bottom[None, :] >= 0) & (db >= 1) & (db <= len(REF_BOTTOM))
    idx_b = np.clip(db.astype(int), 1, len(REF_BOTTOM)) - 1
    sb = np.where(valid_b, REF_BOTTOM[np.clip(idx_b, 0, len(REF_BOTTOM) - 1)], 0.0)
    ab = np.where(valid_b, REF_ALPHA[np.clip(idx_b, 0, len(REF_ALPHA) - 1)], 0.0)
    # 左缘：像素在第 y 行 body 左缘之左 d 像素（同形、振幅 ×0.738、外圈软淡出）
    dl = (row_left[:, None] - xx).astype(float)
    valid_l = (~body) & (row_left[:, None] >= 0) & (dl >= 1) & (dl <= LEFT_REACH)
    idx_l = np.clip(dl.astype(int), 1, LEFT_REACH) - 1
    sl = np.where(valid_l, REF_BOTTOM[np.clip(idx_l, 0, len(REF_BOTTOM) - 1)] * LEFT_RATIO, 0.0)
    al = np.where(valid_l, LEFT_ALPHA[np.clip(idx_l, 0, LEFT_REACH - 1)], 0.0)

    # 左/下取较强者（角部两带叠加时以近缘者为准）
    strength = np.where(sb >= sl, sb, sl)
    alpha_s = np.where(sb >= sl, ab, al)

    # 只在有影处覆盖；body 边缘 AA 与上/右原样保留
    delta = TINT[None, None, :] * strength[..., None]      # 压暗量 → 通道差
    shadow_rgb = np.clip(PAGE[None, None, :] - delta, 0, 255)
    use = strength > 0.4
    out_rgb = np.where(use[..., None], shadow_rgb, arr[..., :3])
    out_a = np.where(use, alpha_s * 255.0, A)
    out = np.dstack([out_rgb, out_a]).clip(0, 255).astype('uint8')
    res = Image.fromarray(out, 'RGBA')
    res.save(os.path.join(PREP, out_name))

    # 核对：中线带压暗量
    ys, xs = np.where(body)
    y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    bx0, bx1 = x0 + (x1 - x0) // 4, x1 - (x1 - x0) // 4
    comp = out_rgb * (out_a[..., None] / 255.0) + PAGE * (1 - out_a[..., None] / 255.0)
    dark = np.clip(PAGE.mean() - comp.mean(axis=2), 0, None)
    cy = (y0 + y1) // 2
    bot = [dark[y1 + d, bx0:bx1 + 1].mean() for d in range(1, len(REF_BOTTOM) + 1) if y1 + d < H]
    left = [dark[cy, x0 - d] for d in range(1, 6) if x0 - d >= 0]
    print(f'{name} -> {out_name}  shadow px={int(use.sum())}')
    print(f'   bottom d1..: {_profile(bot)}')
    print(f'   left   d1..: {_profile(left)}')
    return res


def main():
    for name, out_name in TILES.items():
        fix_shadow(name, out_name)


if __name__ == '__main__':
    main()
