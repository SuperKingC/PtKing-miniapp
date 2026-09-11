"""tabbar 正式资产落地(2026-09-11;v16s:统一高度归一,修塔罗宽扁扇形屏上偏矮):
白底 2K 生成图 → BEN2 显著性抠透明(floodfill 会把奶白猫额头高光抠穿,BEN2 整块抠软过渡)
→ 最大连通域清理(BEN2 四角杂散 alpha 会把 bbox 撑成全幅,归一失效)
→ 紧 bbox 统一【高度】归一到 162px 画布 → 落 prepared/。

归一规则演进:
- v13s/v14s 用「统一长边=140」:宽高比差异大的物件(塔罗扇 宽高比1.37-1.54)宽顶满时
  高度只有其他枚的 65%,屏上明显偏矮——底栏图标坐在文字上方,人眼比的是高度。
- v16s 改「统一高度=130,宽超 156 时按宽缩」:8 枚屏上高度一致,宽扁物件按宽封顶。

JOBS: (落包名, 生成图名)。6 枚沿用 v14s 生成图与 BEN2 缓存(图没变,只换归一),
塔罗 2 枚为 v16s 重生(收拢扇形,外接框接近正方形)。落包名全部升 v16s(内容全变,防缓存)。
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

JOBS = [
    # (落包名, 生成图名=BEN2 缓存名)
    ('icon-tab-test-v16s',         'icon-tab-test-v14s'),
    ('icon-tab-test-active-v16s',  'icon-tab-test-active-v14s'),
    ('icon-tab-tarot-v16s',        'icon-tab-tarot-v16s'),
    ('icon-tab-tarot-active-v16s', 'icon-tab-tarot-active-v16s'),
    ('icon-tab-records-v16s',      'icon-tab-records-v14s'),
    ('icon-tab-records-active-v16s', 'icon-tab-records-active-v14s'),
    ('icon-tab-me-v16s',           'icon-tab-me-v14s'),
    ('icon-tab-me-active-v16s',    'icon-tab-me-active-v14s'),
]

CANVAS = 162
TARGET_HEIGHT = 130   # 统一 bbox 高(162 画布的 80%,对齐 v11s 75%-90% 观感)
MAX_WIDTH = 156       # 宽上限:超过则按宽缩(塔罗若仍偏宽以此兜底)
ALPHA_THRESHOLD = 24
DOWNSAMPLE = 8        # 连通域标记在 1/8 分辨率上做


def largest_component_mask(alpha: np.ndarray) -> np.ndarray:
    """只保留最大连通域(1/8 分辨率 4 邻域 BFS),清掉 BEN2 四角杂散 alpha。"""
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
    cleaned[: full_keep.shape[0], : full_keep.shape[1]] = np.where(full_keep, alpha, 0)
    return cleaned


def main() -> None:
    # 1) BEN2 抠透明(缓存命中跳过,只对新图加载模型)
    missing = [src for _, src in JOBS if not (BEN2_OUT / f'{src}.png').exists()]
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
        for src in missing:
            hits = sorted(GENERATED.glob(f'{src}.png')) + sorted(GENERATED.glob(f'{src}.jpg'))
            if not hits:
                raise SystemExit(f'missing generated: {src}')
            image = Image.open(hits[-1]).convert('RGB')
            result = model.inference(image).convert('RGBA')
            result.save(BEN2_OUT / f'{src}.png')
            print(f'{src}: ben2 matted {result.size}')

    # 2) 清杂散 alpha → 紧 bbox → 统一高度归一(宽超限按宽缩) → 居中 162 画布
    for final, src in JOBS:
        img = Image.open(BEN2_OUT / f'{src}.png').convert('RGBA')
        alpha = np.array(img.getchannel('A'))
        cleaned = largest_component_mask(alpha)
        img.putalpha(Image.fromarray(cleaned))

        ys, xs = np.nonzero(cleaned > ALPHA_THRESHOLD)
        if len(xs) == 0:
            raise SystemExit(f'{src}: empty alpha after cleanup')
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
        print(f'{final}: bbox {bw}x{bh} -> {new_size[0]}x{new_size[1]} on {CANVAS} ({note})')


if __name__ == '__main__':
    main()
