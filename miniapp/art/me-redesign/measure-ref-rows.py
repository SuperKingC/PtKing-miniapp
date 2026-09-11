"""实测选定稿 ui-3_v2.png 的列表行几何,给工程 rpx 换算依据。

锚点:横幅面板宽 1380px(BOX x135..1515)对应工程卡宽 670rpx
(750 - 页边距 40*2),scale = 670/1380 ≈ 0.4855 rpx/px。
测:4 枚列表图标的 bbox 高度与行中心距(pitch),推 entry padding。
"""
from pathlib import Path

import numpy as np
from PIL import Image

REF = Path('D:/Mine/PtKing-miniapp/art/generated-art/me-redesign-ui/ui-3_v2.png')
image = Image.open(REF).convert('RGB')
W, H = image.size

# 列表卡与横幅同宽:x 135..1515;y 范围取横幅下方第一张卡(缩略图观察 y≈940..1740)
# 图标列在卡左侧 x≈180..420,逐行找与卡底色差异大的像素
strip = np.array(image.crop((150, 920, 480, 1780)))
# 卡底色 #faf6ee 附近;图标是蓝/杏饱和色块,用 RGB 距离卡底色 > 60 判定
bg = np.array([250, 246, 238])
dist = np.sqrt(((strip.astype(int) - bg) ** 2).sum(axis=2))
hot = dist > 60

# 按行聚簇
rows = hot.any(axis=1)
clusters = []
start = None
for i, v in enumerate(rows):
    if v and start is None:
        start = i
    elif not v and start is not None:
        clusters.append((start, i))
        start = None
if start is not None:
    clusters.append((start, len(rows)))
clusters = [(a, b) for a, b in clusters if b - a > 40]  # 滤掉虚线等小噪

print('icon row clusters (strip y-offset +920):')
centers = []
for a, b in clusters:
    seg = hot[a:b]
    xs = np.where(seg.any(axis=0))[0]
    print(f'  y {a + 920}..{b + 920} h={b - a}px  x {xs.min() + 150}..{xs.max() + 150}')
    centers.append((a + b) / 2 + 920)

pitches = [centers[i + 1] - centers[i] for i in range(len(centers) - 1)]
print('centers:', [round(c) for c in centers])
print('pitches:', [round(p, 1) for p in pitches])

scale = 670 / 1380
for a, b in clusters:
    print(f'icon h {(b - a)}px -> {(b - a) * scale:.1f}rpx')
print('pitches rpx:', [round(p * scale, 1) for p in pitches])
print('target pitch rpx avg:', round(np.mean(pitches) * scale, 1))
