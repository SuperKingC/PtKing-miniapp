"""Resize kit-matted tab icons to bundled display resolution."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art/generated-art/tabbar-v9/matted/floodfill'
TARGET = ROOT / 'miniapp/src/assets/tabbar'

for name in ('test-v9', 'test-active-v9', 'records-active-v9'):
    image = Image.open(SOURCE / f'icon-tab-{name}_floodfill.png').convert('RGBA')
    # Normalize transparent margins so selected states have equal visual height.
    bounds = image.getchannel('A').point(lambda value: 255 if value > 32 else 0).getbbox()
    if bounds is None:
        raise ValueError(f'Empty icon: {name}')
    image = image.crop(bounds)
    image.thumbnail((144, 144), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (160, 160))
    canvas.paste(image, ((160 - image.width) // 2, (160 - image.height) // 2))
    destination = TARGET / f'{name}.png'
    canvas.save(destination)
    size = destination.stat().st_size
    assert size <= 180 * 1024, (name, size)
    print(f'{destination.name}: 160x160, {size} bytes')
