# 测测子牌桌预览 v4：4:3 长桌构图收到显示尺寸。
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
DEST = ROOT / "miniapp" / "src" / "assets" / "illus"
PREP = Path(__file__).resolve().parent / "prepared"
PREP.mkdir(exist_ok=True)

# 预览窗约 327x248rpx，3x = 981x744；收在 520x390 已够清
OUT_W, OUT_H = 520, 390
SRC = ROOT / "art/generated-art/tarot-skin-thumbs-v4-clay/tarot-skin-clay-v4.png"
NAME = "tarot-skin-clay-v4.jpg"

image = Image.open(SRC).convert("RGB")
image = image.resize((OUT_W, OUT_H), Image.Resampling.LANCZOS)
out = DEST / NAME
image.save(out, "JPEG", quality=85, optimize=True, progressive=True)
image.save(PREP / NAME, "JPEG", quality=85, optimize=True, progressive=True)
print(f"{NAME}: {SRC.name} -> {OUT_W}x{OUT_H}  {out.stat().st_size // 1024} KB")
