"""Resize standalone kit assets, then remove the book background with kit floodfill."""
from pathlib import Path
import subprocess
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parent
TARGET = ROOT.parents[1] / 'src/assets/illus'
PREPARED = ROOT / 'prepared'
PREPARED.mkdir(exist_ok=True)
TARGET.mkdir(parents=True, exist_ok=True)

image = Image.open(ROOT / 'generated-art/tarot/tarot-home-clay-v1.png').convert('RGB')
image.thumbnail((900, 600), Image.Resampling.LANCZOS)
image.save(PREPARED / 'tarot-home-clay-v1.png')

image = Image.open(ROOT / 'generated-art/records/records-book-clay-v1.png').convert('RGB')
image.thumbnail((480, 480), Image.Resampling.LANCZOS)
source = PREPARED / 'records-book-clay-v1.png'
image.save(source)
subprocess.run([sys.executable, 'D:/Mine/miniapp-kit/matting/floodfill_matting.py', str(source), str(PREPARED), '--tol', '28', '--no-compare'], check=True)
for source in (PREPARED / 'tarot-home-clay-v1.png', PREPARED / 'floodfill/records-book-clay-v1_floodfill.png'):
    with Image.open(source) as image:
        print(f'{source.name}: {image.size}, {source.stat().st_size} bytes, {image.mode}')
