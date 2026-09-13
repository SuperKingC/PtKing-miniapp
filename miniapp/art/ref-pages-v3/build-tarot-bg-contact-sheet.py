#!/usr/bin/env python3
"""把塔罗背景候选拼成带编号的对照大图,供用户挑选。

用法:
  python miniapp/art/ref-pages-v3/build-tarot-bg-contact-sheet.py \
      --dir art/generated-art/tarot-bg-options \
      --out art/generated-art/tarot-bg-options/_contact-sheet.jpg \
      [--cols 5] [--cell 360]

按文件名里的 optN 数字排序,每格底部压编号标签。
只做拼图与标注,不裁剪、不改色。
"""
import argparse
import glob
import os
import re
from PIL import Image, ImageDraw

LABEL_H = 40


def opt_index(path: str) -> int:
    m = re.search(r"opt(\d+)", os.path.basename(path))
    return int(m.group(1)) if m else 9999


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--cols", type=int, default=5)
    ap.add_argument("--cell", type=int, default=360, help="单格宽度(px)")
    args = ap.parse_args()

    files = sorted(
        (p for p in glob.glob(os.path.join(args.dir, "*"))
         if os.path.splitext(p)[1].lower() in (".png", ".jpg", ".jpeg", ".webp")
         and not os.path.basename(p).startswith("_")),
        key=opt_index,
    )
    if not files:
        raise SystemExit("没有找到候选图")

    cell_w = args.cell
    cell_h = int(cell_w * 3 / 2) + LABEL_H
    cols = args.cols
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), (247, 244, 238))
    draw = ImageDraw.Draw(sheet)

    for i, path in enumerate(files):
        img = Image.open(path).convert("RGB")
        # 等比缩放进 cell_w × (cell_h - LABEL_H) 的框
        box_h = cell_h - LABEL_H
        scale = min(cell_w / img.width, box_h / img.height)
        img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
        cx, cy = i % cols, i // cols
        ox = cx * cell_w + (cell_w - img.width) // 2
        oy = cy * cell_h + (box_h - img.height) // 2
        sheet.paste(img, (ox, oy))
        idx = opt_index(path)
        label = f"opt{idx}" if idx != 9999 else os.path.basename(path)
        draw.rectangle([cx * cell_w, cy * cell_h + box_h, (cx + 1) * cell_w, (cy + 1) * cell_h], fill=(233, 223, 208))
        draw.text((cx * cell_w + 12, cy * cell_h + box_h + 11), label, fill=(90, 70, 52))

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    sheet.save(args.out, quality=90)
    print(f"{len(files)} 张 -> {args.out} ({sheet.width}x{sheet.height})")


if __name__ == "__main__":
    main()
