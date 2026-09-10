"""Prepare the kit BEN2 output for the miniapp, then compress once with TinyPNG."""
import base64
import io
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
source = Path(__file__).with_name('me-banner-baked-shadow-v1_ben2.png')
image = Image.open(source).convert('RGBA')
# Discard near-transparent segmentation noise before finding the subject bounds.
alpha = image.getchannel('A').point(lambda value: 0 if value < 16 else value)
alpha_array = np.array(alpha)
count, labels, stats, _ = cv2.connectedComponentsWithStats((alpha_array > 0).astype(np.uint8), 8)
subject = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
alpha_array[labels != subject] = 0
alpha = Image.fromarray(alpha_array)
image.putalpha(alpha)
bounds = alpha.getbbox()
assert bounds, 'Matting output is empty'
image = image.crop(bounds)
image.thumbnail((720, 360), Image.Resampling.LANCZOS)
canvas = Image.new('RGBA', (image.width + 16, image.height + 16))
canvas.paste(image, (8, 8))
buffer = io.BytesIO()
canvas.save(buffer, format='PNG')
keys = {}
for line in (ROOT.parent / 'miniapp-kit' / '.env').read_text(encoding='utf-8').splitlines():
    name, separator, value = line.partition('=')
    if separator and name.strip().startswith('TINYPNG_API_KEY'):
        keys[name.strip()] = value.strip().strip('\"\'')
key = next((os.environ.get(name, value) for name, value in sorted(keys.items()) if value), None)
assert key, 'TinyPNG key missing'
auth = 'Basic ' + base64.b64encode(('api:' + key).encode()).decode()
request = Request('https://api.tinify.com/shrink', data=buffer.getvalue(), headers={'Authorization': auth, 'Content-Type': 'application/octet-stream'})
with urlopen(request, timeout=120) as response:
    result = json.load(response)
with urlopen(Request(result['output']['url'], headers={'Authorization': auth}), timeout=120) as response:
    compressed = response.read()
assert len(compressed) <= 180 * 1024, 'Asset exceeds 180 KB'
output = ROOT / 'miniapp/src/assets/illus/me-banner-transparent-v2.png'
output.write_bytes(compressed)
print(f'Output: {output.name}; dimensions={canvas.size}; bytes={len(compressed)}; source bounds={bounds}')
