"""实机验收拼图:把四个 tab 的整机底栏裁出、横排、放大,核对塔罗 v18s 两状态与其余三枚未改。

截图来自 shot-tabbar.local.cjs(automator),落在 art/verify-shots/。
底栏约在整页底部 130px(1115 高 × 518 宽,几何取自 src/custom-tab-bar/index.scss)。
用法:python crop-tabbar-shots.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]  # repo root
SHOTS = ROOT / 'art/verify-shots'
OUT = ROOT / 'miniapp/art/tabbar-v18-options/sheets'
OUT.mkdir(parents=True, exist_ok=True)

PAGES = [('test', '测试页·测试选中'), ('tarot', '塔罗页·塔罗选中'),
         ('records', '记录页·记录选中'), ('me', '我的页·我的选中')]
BAR_H = 132   # 底部底栏像素高
SCALE = 2


def font(size: int) -> ImageFont.FreeTypeFont:
    for name in ('msyh.ttc', 'simhei.ttf'):
        p = Path('C:/Windows/Fonts') / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def main() -> None:
    crops = []
    for tag, _ in PAGES:
        im = Image.open(SHOTS / f'v18s-tabbar-{tag}.png').convert('RGB')
        w, h = im.size
        c = im.crop((0, h - BAR_H, w, h))
        crops.append(c.resize((c.width * SCALE, c.height * SCALE), Image.Resampling.LANCZOS))
    cw = max(c.width for c in crops)
    lab_h = 34
    W = cw + 40
    H = sum(c.height + lab_h + 18 for c in crops) + 60
    im = Image.new('RGB', (W, H), (254, 250, 245))
    d = ImageDraw.Draw(im)
    d.text((16, 16), '实机验收：四页底栏（塔罗/我的已换 v18s，测试/记录未改）', fill=(111, 97, 82), font=font(30))
    y = 58
    for (tag, lab), c in zip(PAGES, crops):
        d.text((20, y), lab, fill=(111, 97, 82), font=font(22))
        im.paste(c, (20, y + lab_h))
        y += c.height + lab_h + 18
    out = OUT / 'verify-devtools-tabbar.png'
    im.save(out)
    print(f'→ {out.relative_to(ROOT)}')

if __name__ == '__main__':
    main()
