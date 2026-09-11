"""tabbar v14s 正式资产落地(2026-09-11,用户选定 v12-A 极简素净):
白底 2K 生成图 → BEN2 显著性抠透明(floodfill 会把奶白猫额头高光抠穿,BEN2 整块抠软过渡)
→ 最大连通域清理(BEN2 四角有杂散 alpha,不清会把 bbox 撑成全幅,归一失效)
→ 紧 bbox 统一长边归一到 162px 画布 → 落 prepared/。
之后 compress-tabbar-v14s.mjs 走 TinyPNG(PNG8)落包。

用户硬要求:8 枚图标视觉大小与主体占比一致 → 清杂后量紧 bbox,统一缩放到
bbox 最长边 = 140,居中贴 162 画布。BEN2 产物有缓存:ben2/ 下已存在的直接复用。
"""
from pathlib import Path
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
GENERATED = ROOT / 'generated'
PREPARED = ROOT / 'prepared'
PREPARED.mkdir(exist_ok=True)
BEN2_OUT = PREPARED / 'ben2'
BEN2_OUT.mkdir(exist_ok=True)

NAMES = [
    'icon-tab-test-v14s',
    'icon-tab-test-active-v14s',
    'icon-tab-tarot-v14s',
    'icon-tab-tarot-active-v14s',
    'icon-tab-records-v14s',
    'icon-tab-records-active-v14s',
    'icon-tab-me-v14s',
    'icon-tab-me-active-v14s',
]

CANVAS = 162
# 主体在 162 画布上的统一外接框长边:对齐现役 v11s 的 75%-90% 观感,取 140。
TARGET_LONG_EDGE = 140
ALPHA_THRESHOLD = 24
DOWNSAMPLE = 8  # 连通域标记在 1/8 分辨率上做,主体边缘软 alpha 不受影响


def latest(name: str) -> Path:
    hits = sorted(GENERATED.glob(f'{name}.png')) + sorted(GENERATED.glob(f'{name}.jpg'))
    if not hits:
        raise SystemExit(f'missing generated: {name}')
    return hits[-1]


def largest_component_mask(alpha: np.ndarray) -> np.ndarray:
    """返回与 alpha 同尺寸的 keep 布尔阵:只保留最大连通域(含其 8px 块邻域)。"""
    h, w = alpha.shape
    small = alpha[: h // DOWNSAMPLE * DOWNSAMPLE, : w // DOWNSAMPLE * DOWNSAMPLE]
    blocks = small.reshape(h // DOWNSAMPLE, DOWNSAMPLE, w // DOWNSAMPLE, DOWNSAMPLE)
    block_on = (blocks > ALPHA_THRESHOLD).any(axis=(1, 3))
    bh, bw = block_on.shape

    seen = np.zeros_like(block_on, dtype=bool)
    best_keep = None
    best_size = -1
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
                best_size = len(comp)
                best_keep = set(comp)

    keep = np.zeros((bh, bw), dtype=bool)
    for y, x in best_keep:
        keep[y, x] = True
    full_keep = np.kron(keep, np.ones((DOWNSAMPLE, DOWNSAMPLE), dtype=bool))
    cleaned = np.zeros_like(alpha)
    cleaned[: full_keep.shape[0], : full_keep.shape[1]] = np.where(full_keep, alpha, 0)
    return cleaned


def main() -> None:
    # 1) BEN2 抠透明(ben2/ 下已存在则复用缓存,不重跑模型)
    matted = {}
    missing = [n for n in NAMES if not (BEN2_OUT / f'{n}.png').exists()]
    if missing:
        KIT = Path('D:/Mine/miniapp-kit/matting')
        sys.path.insert(0, str(KIT))
        import torch
        from BEN2 import BEN_Base
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        model = BEN_Base().to(device).eval()
        from safetensors.torch import load_file
        model.load_state_dict(load_file(str(KIT / 'BEN2_Base.safetensors')), strict=True)
        print(f'BEN2 loaded on {device}')
        for name in missing:
            image = Image.open(latest(name)).convert('RGB')
            result = model.inference(image).convert('RGBA')
            result.save(BEN2_OUT / f'{name}.png')
            print(f'{name}: ben2 matted {result.size}')

    # 2) 清杂散 alpha → 紧 bbox → 统一长边归一 → 居中 162 画布
    for name in NAMES:
        img = Image.open(BEN2_OUT / f'{name}.png').convert('RGBA')
        alpha = np.array(img.getchannel('A'))
        cleaned = largest_component_mask(alpha)
        kept = (cleaned > ALPHA_THRESHOLD).sum()
        raw = (alpha > ALPHA_THRESHOLD).sum()
        img.putalpha(Image.fromarray(cleaned))

        ys, xs = np.nonzero(cleaned > ALPHA_THRESHOLD)
        if len(xs) == 0:
            raise SystemExit(f'{name}: empty alpha after cleanup')
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        bw, bh = x1 - x0, y1 - y0
        scale = TARGET_LONG_EDGE / max(bw, bh)
        cropped = img.crop((x0, y0, x1, y1))
        new_size = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
        resized = cropped.resize(new_size, Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.paste(resized, ((CANVAS - new_size[0]) // 2, (CANVAS - new_size[1]) // 2), resized)
        canvas.save(PREPARED / f'{name}.png')
        print(f'{name}: strays {(raw - kept) / max(raw, 1):.1%} | bbox {bw}x{bh} -> {new_size[0]}x{new_size[1]} on {CANVAS}')


if __name__ == '__main__':
    main()
