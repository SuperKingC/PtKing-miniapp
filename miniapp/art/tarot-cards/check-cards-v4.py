#!/usr/bin/env python
"""检查测测子牌面：外圈卡框/素色底板，以及高对比横条（疑似烘焙文字）。"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / 'art/generated-art/tarot-cards-v4'
CARDS = [
    'the-fool', 'the-magician', 'high-priestess', 'the-empress', 'the-emperor',
    'the-hierophant', 'the-lovers', 'the-chariot', 'strength', 'the-hermit',
    'wheel-of-fortune', 'justice', 'the-hanged-man', 'death', 'temperance',
    'the-devil', 'the-tower', 'the-star', 'the-moon', 'the-sun', 'judgement',
    'the-world',
]


def load_rgb(name: str) -> np.ndarray | None:
    for ext in ('.png', '.jpg', '.jpeg'):
        path = SRC / f'{name}{ext}'
        if path.exists():
            return np.asarray(Image.open(path).convert('RGB'), dtype=np.float32)
    return None


def edge_margin(arr: np.ndarray) -> dict[str, float]:
    h, w, _ = arr.shape
    ring = np.concatenate([
        arr[:3].reshape(-1, 3),
        arr[-3:].reshape(-1, 3),
        arr[:, :3].reshape(-1, 3),
        arr[:, -3:].reshape(-1, 3),
    ])
    bg = np.median(ring, axis=0)
    dist = np.linalg.norm(arr - bg, axis=2)
    thresh = max(18.0, float(np.percentile(dist, 20)))
    mid_y0, mid_y1 = int(h * 0.3), int(h * 0.7)
    mid_x0, mid_x1 = int(w * 0.3), int(w * 0.7)
    col = dist[mid_y0:mid_y1].mean(axis=0)
    row = dist[:, mid_x0:mid_x1].mean(axis=1)

    def first_hit(values: np.ndarray) -> int:
        hits = np.where(values > thresh)[0]
        return int(hits[0]) if len(hits) else 0

    def last_hit(values: np.ndarray) -> int:
        hits = np.where(values > thresh)[0]
        return int(len(values) - 1 - hits[-1]) if len(hits) else 0

    left = first_hit(col) / w
    right = last_hit(col) / w
    top = first_hit(row) / h
    bottom = last_hit(row) / h
    return {
        'left': left, 'right': right, 'top': top, 'bottom': bottom,
        'max': max(left, right, top, bottom),
        'bg_luma': float(bg.mean()),
    }


def text_like_score(arr: np.ndarray) -> float:
    """高对比细横条越多，越像烘焙标题。"""
    gray = arr.mean(axis=2)
    h, w = gray.shape
    band = gray[int(h * 0.72):int(h * 0.96), int(w * 0.12):int(w * 0.88)]
    if band.size == 0:
        return 0.0
    gy = np.abs(np.diff(band, axis=0))
    return float(np.percentile(gy, 95))


def main() -> int:
    failed: list[str] = []
    print(f'检查 {SRC}')
    for name in CARDS:
        arr = load_rgb(name)
        if arr is None:
            print(f'  ✗ {name:<20} 缺文件')
            failed.append(name)
            continue
        margin = edge_margin(arr)
        text = text_like_score(arr)
        frame = margin['max'] >= 0.045 and margin['bg_luma'] >= 210
        suspect_text = text >= 28
        flag = []
        if frame:
            flag.append(f"卡框 {margin['max']:.3f}")
        if suspect_text:
            flag.append(f'疑似字 {text:.1f}')
        status = '✗' if flag else '✓'
        extra = ' '.join(flag) if flag else '干净'
        print(f'  {status} {name:<20} {arr.shape[1]}x{arr.shape[0]} {extra}')
        if flag:
            failed.append(name)
    print(f'\n{len(CARDS) - len(failed)}/{len(CARDS)} 通过自动检查')
    if failed:
        print('需重出: ' + ', '.join(failed))
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
