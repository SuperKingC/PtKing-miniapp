"""横幅几何圆角 alpha 蒙版(专业抠图工作流的几何形体分支)。

为什么不用 BEN2:BEN2 是显著性分割,面向有机主体;横幅是 UI 圆角矩形,
大面积浅蓝面板被 BEN2 误判为背景(内部半透明破碎)。几何形体的正确
抠法是测出面板矩形+圆角半径,做抗锯齿 alpha 蒙版,边缘零残留。
烘焙散影随之移除,页面投影由 CSS --shadow-card 承担(与列表卡一致)。
源:选定稿 ui-3_v2.png 直接裁切,与参考图像素同源。
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
REF = Path('D:/Mine/PtKing-miniapp/art/generated-art/me-redesign-ui/ui-3_v2.png')
FINAL = ROOT / 'prepared' / 'final'
FINAL.mkdir(parents=True, exist_ok=True)

image = Image.open(REF).convert('RGB')

# 面板 face bbox(实测:蓝区顶缘 y80、强差异 bbox x137-1513 / 强底缘 y900,晕带 900-905 舍弃)。
# 蒙版满幅贴边:此前内缩 4px 防晕导致页面上面板边缘留透明缝("没撑满"),
# 改为 BOX 直贴强差异缘,蒙版画满 crop 全幅,面板边缘即图边缘。
BOX = (137, 80, 1513, 900)
crop = image.crop(BOX)
w, h = crop.size

# 抗锯齿圆角蒙版:4x 超采样绘制再缩小;半径按参考稿实测 82px(1664 宽基准)同比例
RADIUS = 82
SS = 4
mask = Image.new('L', (w * SS, h * SS), 0)
draw = ImageDraw.Draw(mask)
draw.rounded_rectangle(
    (0, 0, w * SS - 1, h * SS - 1),
    radius=RADIUS * SS, fill=255,
)
mask = mask.resize((w, h), Image.Resampling.LANCZOS)

rgba = crop.convert('RGBA')
rgba.putalpha(mask)

OUT_W = 720
out = rgba.resize((OUT_W, round(h * OUT_W / w)), Image.Resampling.LANCZOS)
out.save(FINAL / 'me-banner-panel-v4-src.png')
print(f'banner v4: crop {BOX} -> {out.size}, ratio {round(out.width / out.height, 3)}')

# 检查图:贴页面底色(左)与品红(右)各一份
pagebg = Image.new('RGB', out.size, (254, 250, 245))
pagebg.paste(out, (0, 0), out)
magenta = Image.new('RGB', out.size, (255, 0, 255))
magenta.paste(out, (0, 0), out)
sheet = Image.new('RGB', (out.width, out.height * 2 + 10), (200, 200, 200))
sheet.paste(pagebg, (0, 0))
sheet.paste(magenta, (0, out.height + 10))
sheet.thumbnail((950, 2000), Image.LANCZOS)
sheet.save(ROOT / 'prepared' / '_check_banner_geom.png')
print('check saved')
