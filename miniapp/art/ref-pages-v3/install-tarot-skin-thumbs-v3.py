# 把 3:2 完整牌桌预览收到 490x330 JPEG，供塔罗首页皮肤格使用。
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
DEST = ROOT / "miniapp" / "src" / "assets" / "illus"
PREP = Path(__file__).resolve().parent / "prepared"
PREP.mkdir(exist_ok=True)

OUT_W, OUT_H = 490, 330

JOBS = [
    (
        ROOT / "art/generated-art/tarot-skin-thumbs-v3-clay/tarot-skin-clay-v3_v2.png",
        "tarot-skin-clay-v3.jpg",
    ),
    (
        ROOT / "art/generated-art/tarot-skin-thumbs-v3-classic/tarot-skin-classic-v2_v2.png",
        "tarot-skin-classic-v2.jpg",
    ),
]

for src, dest_name in JOBS:
    image = Image.open(src).convert("RGB")
    image = image.resize((OUT_W, OUT_H), Image.Resampling.LANCZOS)
    out = DEST / dest_name
    image.save(out, "JPEG", quality=85, optimize=True, progressive=True)
    prepared = PREP / dest_name
    image.save(prepared, "JPEG", quality=85, optimize=True, progressive=True)
    print(f"{dest_name}: {src.name} -> {OUT_W}x{OUT_H}  {out.stat().st_size // 1024} KB")
