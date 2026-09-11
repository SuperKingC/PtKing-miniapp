"""诊断测量:参考稿 ui-3_v2 vs 工程截图 的面板/图标/行距几何。"""
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

REF = Path('D:/Mine/PtKing-miniapp/art/generated-art/me-redesign-ui/ui-3_v2.png')
SHOT = Path(r'C:\Users\admin\.zcode\cli\image-cache\sess_8ac9967f-8c18-4366-8210-86a875787e8b\image-82aceeec99043e6bbd38a16982f77429.png')
OUT = Path(__file__).resolve().parent

pagebg = np.array([252, 247, 238])

def blobs(img_arr, bg, thr, min_area, region=None):
    a = img_arr
    d = np.sqrt(((a - bg) ** 2).sum(axis=2))
    m = (d > thr).astype(np.uint8)
    num, lab, stats, cent = cv2.connectedComponentsWithStats(m, connectivity=8)
    out = []
    for i in range(1, num):
        x, y, w, h, area = stats[i]
        if area >= min_area:
            out.append((int(x), int(y), int(w), int(h), int(area), tuple(round(c) for c in cent[i])))
    return out

def measure(name, path, scale_note=''):
    img = Image.open(path).convert('RGB')
    a = np.array(img).astype(np.int16)
    print(f'== {name} {img.size} ==')
    if 'ref' in name:
        # 横幅面板:蓝调像素 (B>R+6) 最大连通域
        blue = ((a[:, :, 2] - a[:, :, 0]) > 6).astype(np.uint8)
        num, lab, stats, cent = cv2.connectedComponentsWithStats(blue, connectivity=8)
        big = max(range(1, num), key=lambda i: stats[i][4])
        x, y, w, h, area = stats[big]
        print(f'banner blue panel: x{x}-{x+w} y{y}-{y+h} (w{w} h{h})')
        # 面板外的非背景内容(溢出云朵):在面板 bbox 外扩 120px 范围内找
        x0, y0, x1, y1 = max(0, x-120), max(0, y-120), min(a.shape[1], x+w+120), min(a.shape[0], y+h+120)
        reg = a[y0:y1, x0:x1]
        for bx, by, bw, bh, area, c in blobs(reg, pagebg, 16, 800):
            gx0, gy0 = x0+bx, y0+by
            inside = gx0 >= x and gy0 >= y and gx0+bw <= x+w and gy0+bh <= y+h
            tag = 'in-panel' if inside else 'OVERFLOW'
            if not inside:
                print(f'  overflow blob: x{gx0}-{gx0+bw} y{gy0}-{gy0+bh} area{area}')
        # 列表卡与图标
        d = np.sqrt(((a - pagebg) ** 2).sum(axis=2))
        m = (d > 16).astype(np.uint8)
        num, lab, stats, cent = cv2.connectedComponentsWithStats(m, connectivity=8)
        # 大卡 = 面板下最大的连通域
        cards = sorted(range(1, num), key=lambda i: stats[i][4], reverse=True)[:4]
        for i in cards:
            x, y, w, h, area = stats[i]
            print(f'card-ish: x{x}-{x+w} y{y}-{y+h} area{area}')
    # 图标:在给定 y 区间内找 tile
    return a

ref_a = measure('ref', REF)
shot_a = measure('shot', SHOT)

# 参考稿 6 枚图标精确 bbox(按行带分区找最大块)
zones = [('clear', 1140, 1360), ('privacy', 1330, 1550), ('share', 1520, 1740),
         ('feedback', 1710, 1930), ('theme', 2040, 2260), ('haptics', 2230, 2450)]
print('== ref tiles ==')
boxes = {}
for label, y0, y1 in zones:
    reg = ref_a[y0:y1, 150:430]
    found = blobs(reg, pagebg, 16, 4000)
    if not found:
        print(f'{label}: NONE')
        continue
    bx, by, bw, bh, area, c = max(found, key=lambda f: f[4])
    boxes[label] = (150+bx, y0+by, bw, bh)
    print(f'{label}: x{150+bx}-{150+bx+bw} y{y0+by}-{y0+by+bh} (w{bw} h{bh}) center_y {y0+by+bh//2}')

# 参考稿卡片边界(用于比例):列表卡 x 范围在 y=1250
row = ref_a[1250]
d = np.sqrt(((row - pagebg) ** 2).sum(axis=1))
xs = np.where(d > 16)[0]
print('ref entries card @y1250: x', xs.min(), '-', xs.max(), 'w', xs.max()-xs.min())

# 工程截图:卡片与图标
print('== shot ==')
for label, y0, y1 in [('clear', 300, 370), ('privacy', 370, 440), ('share', 440, 510), ('feedback', 505, 580)]:
    reg = shot_a[y0:y1, 40:110]
    found = blobs(reg, np.array([250, 244, 233]), 12, 200)
    if found:
        bx, by, bw, bh, area, c = max(found, key=lambda f: f[4])
        print(f'{label}: x{40+bx}-{40+bx+bw} y{y0+by}-{y0+by+bh} (w{bw} h{bh})')
    else:
        print(f'{label}: none')
row = shot_a[340]
d = np.sqrt(((row - np.array([250, 244, 233])) ** 2).sum(axis=1))
xs = np.where(d > 12)[0]
print('shot entries card @y340: x', xs.min(), '-', xs.max(), 'w', xs.max()-xs.min())

# v7 图标实际主体占画布比例
print('== v7 icon subjects ==')
for label in ['clear', 'privacy', 'share', 'feedback', 'theme', 'haptics']:
    im = Image.open(rf'D:/Mine/PtKing-miniapp/miniapp/src/assets/illus/icon-me-{label}-v7.png').convert('RGBA')
    al = np.array(im)[:, :, 3]
    ys, xs = np.where(al > 24)
    print(f'{label}: canvas {im.size} subject x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()} (w{xs.max()-xs.min()} h{ys.max()-ys.min()}) opaque {round(100*(al>24).mean(),1)}%')
