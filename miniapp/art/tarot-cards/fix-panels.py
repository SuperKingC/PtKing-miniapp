#!/usr/bin/env python
"""塔罗 clay 牌面「去底板」:裁掉牌面板外的素色底,并把面板圆角处的残余底色用邻近内容补平。

根因:多数 clay 牌面被生图成「一张圆角牌摆在一块素色底上」,四周留一圈素色底、四角是圆角;
牌位实框 190×300rpx(比例 0.633)用 aspectFill 渲染,那圈底与圆角就露出来 → 「边缘有其他颜色」。

步骤:
 1) 用图像最外 3px 的底色估背景色;
 2) 按「与底色差 > 阈值」求面板内容包围盒,裁掉外围素色底;
 3) 裁剪后仍与裁剪边框连通的底色像素(主要是四个圆角)用最近内容像素 BFS 外推补平;
    若连通底色占比过大(说明该图本就是素底场景,不是牌面板),则整张跳过,不动像素;
 4) 压到 768 宽存 JPEG。

用法: python miniapp/art/tarot-cards/fix-panels.py [--apply]
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
CARDS = ROOT / 'art/generated-art/tarot/cards'
OUT_WIDTH = 768
QUALITY = 90
DIFF_TOL = 10
SAFE = 3
MAX_FILL_FRAC = 0.35   # 裁剪后连通底色超过这个比例,判为「素底场景」而非牌面板
MIN_CROP = 8           # 四边最大留白小于此值视为已满幅


def border_bg(a: np.ndarray) -> np.ndarray:
    ring = np.concatenate([a[:2].reshape(-1, 3), a[-2:].reshape(-1, 3),
                           a[:, :2].reshape(-1, 3), a[:, -2:].reshape(-1, 3)])
    return np.median(ring, axis=0)


def _first(mask_line: np.ndarray) -> int:
    idx = np.where(mask_line)[0]
    return int(idx[0]) if len(idx) else mask_line.shape[0]


def content_bbox(a: np.ndarray, bg: np.ndarray) -> tuple[int, int, int, int]:
    """用中间 40% 行列的「首次偏离底色」中位数定面板边界(比整体占比法更靠外、更稳)。"""
    h, w, _ = a.shape
    m = np.abs(a - bg).sum(axis=2) > DIFF_TOL
    rows = range(int(h * 0.30), int(h * 0.70))
    cols = range(int(w * 0.30), int(w * 0.70))
    left = int(np.median([_first(m[y]) for y in rows]))
    right = int(np.median([_first(m[y][::-1]) for y in rows]))
    top = int(np.median([_first(m[:, x]) for x in cols]))
    bottom = int(np.median([_first(m[:, x][::-1]) for x in cols]))
    return (min(w, left + SAFE), min(h, top + SAFE),
            max(0, w - right - SAFE), max(0, h - bottom - SAFE))


def connected_bg_mask(crop: np.ndarray, bg: np.ndarray) -> np.ndarray:
    """裁剪图里与边框连通的底色像素。"""
    h, w, _ = crop.shape
    is_bg = np.abs(crop - bg).sum(axis=2) <= DIFF_TOL
    reach = np.zeros((h, w), bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg[y, x] and not reach[y, x]:
                reach[y, x] = True
                dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg[y, x] and not reach[y, x]:
                reach[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and is_bg[ny, nx] and not reach[ny, nx]:
                reach[ny, nx] = True
                dq.append((ny, nx))
    return reach


def fill_from_content(crop: np.ndarray, target: np.ndarray) -> np.ndarray:
    """用最近的非目标像素颜色填平 target 区域(多源 BFS)。"""
    h, w, _ = crop.shape
    out = crop.copy()
    src = deque((y, x) for y, x in zip(*np.where(~target)))
    seen = ~target
    todo = int(target.sum())
    while src and todo > 0:
        y, x = src.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and target[ny, nx]:
                out[ny, nx] = out[y, x]
                seen[ny, nx] = True
                todo -= 1
                src.append((ny, nx))
    return out


def touches_edge_middle(target: np.ndarray) -> bool:
    """残余底色是否伸到任一边的中点区(牌面板的圆角只落在四角,素底场景才会到边中点)。"""
    h, w = target.shape
    mid_y = slice(int(h * 0.35), int(h * 0.65))
    mid_x = slice(int(w * 0.35), int(w * 0.65))
    return bool(target[mid_y, 0].any() or target[mid_y, -1].any()
                or target[0, mid_x].any() or target[-1, mid_x].any())


def process(path: Path, apply: bool) -> str:
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(float)
    h, w, _ = a.shape
    bg = border_bg(a)
    x0, y0, x1, y1 = content_bbox(a, bg)
    margins = (x0, w - x1, y0, h - y1)
    if max(margins) < MIN_CROP:
        return 'full-bleed (skip)'
    crop = a[y0:y1, x0:x1]
    residual = connected_bg_mask(crop, bg)
    frac = residual.mean()
    if frac > MAX_FILL_FRAC or touches_edge_middle(residual):
        return 'plain scene, skip (residual %.2f)' % frac
    fixed = fill_from_content(crop, residual) if frac > 0 else crop
    out = Image.fromarray(np.clip(fixed, 0, 255).astype('uint8'))
    if out.width != OUT_WIDTH:
        out = out.resize((OUT_WIDTH, round(out.height * OUT_WIDTH / out.width)), Image.LANCZOS)
    if apply:
        out.save(path, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    return 'crop %dx%d->%dx%d residual %.2f margins %d,%d,%d,%d' % (
        w, h, out.width, out.height, frac, *margins)


def main() -> None:
    apply = '--apply' in sys.argv
    for f in sorted(CARDS.glob('*-clay.jpg')):
        print('%-30s %s' % (f.name, process(f, apply)))
    print('APPLIED' if apply else 'DRY RUN (加 --apply 落盘)')


if __name__ == '__main__':
    main()
