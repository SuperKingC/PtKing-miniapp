# 一次性：把选定的塔罗牌桌背景候选归一并压到包内红线内 → COS 资产名。
# 用户 2026-09-12 选定：通透玻璃球(球内旋涡星云) + 长桌构图 + 蜡烛不画火焰(火焰走 CSS)。
# 迭代：首版 opt1 是 2:3 宽板桌，用户指出「桌子要像之前一样长长的」——旧背景是细长长桌、
#       远端窄(约 0.5 画宽)落在画高 0.41、向观者迅速外扩到满幅，纵深强。
#       改用 art/prompts-tarot-bg-long.txt + --ref 旧背景重出，最终采用 long2。
# 关键：不裁切、只等比缩放 —— 火焰特效叠加依赖「烛芯在图上的比例坐标」，
#       裁切会改变比例坐标导致火焰错位。展示用 aspectFill（按高适配、左右裁），
#       比例坐标始终以整图为基准，因此等比缩放是安全的。
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]  # D:/Mine/PtKing-miniapp
SRC = ROOT / 'art' / 'generated-art' / 'tarot-bg-long' / 'tarot-bg-long2.png'
DEST = ROOT / 'art' / 'generated-art' / 'tarot' / 'ui' / 'sanctuary-background-clay-v2.jpg'

OUT_W = 768  # 竖长版；高度按源图比例计算
QUALITY = 88
MAX_KB = 180

im = Image.open(SRC).convert('RGB')
out_h = round(OUT_W * im.height / im.width)
out = im.resize((OUT_W, out_h), Image.LANCZOS)
DEST.parent.mkdir(parents=True, exist_ok=True)
out.save(DEST, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
kb = DEST.stat().st_size / 1024
flag = 'OK' if kb <= MAX_KB else '❌ 超红线'
print(f'{DEST.name}: {im.size} -> {OUT_W}x{out_h}  ratio {OUT_W/out_h:.5f}  q{QUALITY}  {kb:.0f}KB  {flag}')
if kb > MAX_KB:
    raise RuntimeError(f'{DEST} exceeds {MAX_KB}KB')
