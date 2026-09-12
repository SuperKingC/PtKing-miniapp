"""tabbar v18 五组方案落地:生成图 → 泛洪抠透明 → 最大连通域清理 → 紧 bbox 统一高度归一到 162 画布 → prepared/。

沿用 v17s 链路(见 ../tabbar-v14s/prepare.py):
- 抠图:kit matting/floodfill_matting.py 白底软抠(纯 numpy+PIL,系统 python 可直跑),
  产物落 prepared/floodfill/<生成名>_floodfill.png;已存在则跳过(重跑只做归一)。
- 归一:统一【高度】=130(162 画布 80%),宽超 156 按宽缩 —— 底栏图标坐在文字上方,人眼比高度。
- 最大连通域:四角杂散 alpha 会把 bbox 撑成全幅使归一失效,先按 1/8 分辨率 4 邻域只留最大块。

用法:python prepare-v18.py            → 抠图(缺则补)+ 归一全部候选
     python prepare-v18.py --no-matting → 只跑归一(复用已有 floodfill)
     python prepare-v18.py --only v18a  → 只处理子串命中条目
"""
import argparse
import subprocess
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
GENERATED = ROOT / 'generated'
PREPARED = ROOT / 'prepared'
FLOOD_OUT = PREPARED / 'floodfill'
KIT_FLOODFILL = Path('D:/Mine/miniapp-kit/matting/floodfill_matting.py')

CANVAS = 162
TARGET_HEIGHT = 130
MAX_WIDTH = 156
ALPHA_THRESHOLD = 24
DOWNSAMPLE = 8


def largest_component_mask(alpha: np.ndarray) -> np.ndarray:
    """只保留最大连通域(1/8 分辨率 4 邻域 BFS),清掉四角杂散 alpha。"""
    h, w = alpha.shape
    small = alpha[: h // DOWNSAMPLE * DOWNSAMPLE, : w // DOWNSAMPLE * DOWNSAMPLE]
    blocks = small.reshape(h // DOWNSAMPLE, DOWNSAMPLE, w // DOWNSAMPLE, DOWNSAMPLE)
    block_on = (blocks > ALPHA_THRESHOLD).any(axis=(1, 3))
    bh, bw = block_on.shape

    seen = np.zeros_like(block_on, dtype=bool)
    best_keep, best_size = None, -1
    for sy in range(bh):
        for sx in range(bw):
            if not block_on[sy, sx] or seen[sy, sx]:
                continue
            queue = deque([(sy, sx)])
            seen[sy, sx] = True
            comp = [(sy, sx)]
            while queue:
                y, x = queue.popleft()
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < bh and 0 <= nx < bw and block_on[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        queue.append((ny, nx))
                        comp.append((ny, nx))
            if len(comp) > best_size:
                best_size, best_keep = len(comp), set(comp)

    keep = np.zeros((bh, bw), dtype=bool)
    for y, x in best_keep:
        keep[y, x] = True
    full_keep = np.kron(keep, np.ones((DOWNSAMPLE, DOWNSAMPLE), dtype=bool))
    cleaned = np.zeros_like(alpha)
    fh = min(full_keep.shape[0], alpha.shape[0])
    fw = min(full_keep.shape[1], alpha.shape[1])
    cleaned[:fh, :fw] = np.where(full_keep[:fh, :fw], alpha[:fh, :fw], 0)
    return cleaned


def matte(src: Path) -> Path:
    """生成图 → prepared/floodfill/<stem>_floodfill.png(已存在则复用)。"""
    out = FLOOD_OUT / f'{src.stem}_floodfill.png'
    if out.exists():
        return out
    FLOOD_OUT.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, str(KIT_FLOODFILL), str(src), str(PREPARED), '--no-compare']
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    sys.stdout.write(r.stdout)
    if r.returncode != 0 or not out.exists():
        sys.stderr.write(r.stderr)
        raise SystemExit(f'floodfill 失败: {src.name}')
    return out


def normalize(src: Path, final: str) -> str:
    img = Image.open(src).convert('RGBA')
    alpha = np.array(img.getchannel('A'))
    cleaned = largest_component_mask(alpha)
    img.putalpha(Image.fromarray(cleaned))

    ys, xs = np.nonzero(cleaned > ALPHA_THRESHOLD)
    if len(xs) == 0:
        raise SystemExit(f'{src.name}: 清理后 alpha 为空')
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    bw, bh = x1 - x0, y1 - y0
    scale = TARGET_HEIGHT / bh
    if bw * scale > MAX_WIDTH:
        scale = MAX_WIDTH / bw
    cropped = img.crop((x0, y0, x1, y1))
    new_size = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
    resized = cropped.resize(new_size, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(resized, ((CANVAS - new_size[0]) // 2, (CANVAS - new_size[1]) // 2), resized)
    canvas.save(PREPARED / f'{final}.png')
    note = 'height' if abs(bh * scale - TARGET_HEIGHT) < 1 else 'width-capped'
    return f'{final}: bbox {bw}x{bh} -> {new_size[0]}x{new_size[1]} on {CANVAS} ({note})'


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-matting', action='store_true', help='跳过抠图,只归一')
    ap.add_argument('--only', default='', help='只处理 name 含该子串的条目')
    args = ap.parse_args()

    PREPARED.mkdir(exist_ok=True)
    srcs = sorted(p for p in GENERATED.glob('*.png') if args.only in p.stem)
    if not srcs:
        raise SystemExit(f'generated/ 没有候选图(only={args.only!r})')
    for src in srcs:
        matted = src if args.no_matting else matte(src)
        print(normalize(matted, src.stem))
    print(f'[prepare-v18] {len(srcs)} 枚 → prepared/')


if __name__ == '__main__':
    main()
