"""底栏实景对照:v18 五组方案各渲染一条真实比例底栏,并排上未改动的「记录」图标,
看新三枚是否与保留的第四枚同质。测试 tab 设为选中态(一条里同时看到未选中/选中两种状态)。

几何取自 src/custom-tab-bar/index.scss(rpx→px 用 SCALE=2):
  胶囊左右 28rpx、高约 167rpx;图标 104rpx;图标与文字 gap 6rpx;文字 22rpx、上移 6rpx。
用法:python mock-tabbar.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
PREPARED = ROOT / 'prepared'
PKG_TABBAR = ROOT.parents[1] / 'src' / 'assets' / 'tabbar'
SHEETS = ROOT / 'sheets'
SHEETS.mkdir(exist_ok=True)

S = 2  # px per rpx
PAGE_PX = (254, 250, 245)
CAP_TOP = (253, 246, 232)
CAP_BOT = (236, 222, 202)
INK = (111, 97, 82)
INK_ACTIVE = (184, 112, 62)

DIRS = ['v18a', 'v18b', 'v18c', 'v18d', 'v18e']
DIR_LABELS = {
    'v18a': 'A 现版精修·高对比', 'v18b': 'B 暖陶土甜暖', 'v18c': 'C 粉雾蓝清凉',
    'v18d': 'D 厚体积胖软陶', 'v18e': 'E 极简符号',
}
TABS = [('测试', 'test'), ('塔罗', 'tarot'), ('记录', 'records'), ('我的', 'me')]
SELECTED = 0  # 测试 tab 选中


def font(size: int) -> ImageFont.FreeTypeFont:
    for name in ('msyh.ttc', 'simhei.ttf'):
        p = Path('C:/Windows/Fonts') / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def load_icon(tab: str, active: bool, did: str | None) -> Image.Image:
    """did=None → 取包内现行「记录」图标(未被本任务改动)。"""
    if did is None:
        name = f'icon-tab-{tab}-active-v17s.png' if active else f'icon-tab-{tab}-v17s.png'
        p = PKG_TABBAR / name
    else:
        p = PREPARED / f'icon-tab-{tab}{"-active" if active else ""}-{did}.png'
    if not p.exists():
        raise SystemExit(f'缺图标: {p}')
    return Image.open(p).convert('RGBA')


def bar(did: str | None, width_rpx: int = 750) -> Image.Image:
    W, cap_h = width_rpx * S, 167 * S
    H = 200 * S
    im = Image.new('RGB', (W, H), PAGE_PX)
    d = ImageDraw.Draw(im)
    # 页面底色 + 胶囊
    x0, x1 = 28 * S, W - 28 * S
    y0 = 16 * S
    # 胶囊:整幅宽竖直渐变 + 圆角蒙版(避免小块渐变拼贴的台阶)
    cw_px, ch_px = x1 - x0, cap_h
    col = Image.new('RGB', (1, ch_px))
    for i in range(ch_px):
        t = i / (ch_px - 1)
        col.putpixel((0, i), tuple(int(CAP_TOP[c] + (CAP_BOT[c] - CAP_TOP[c]) * t) for c in range(3)))
    grad = col.resize((cw_px, ch_px), Image.Resampling.BILINEAR)
    mask = Image.new('L', (cw_px, ch_px), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, cw_px - 1, ch_px - 1], radius=ch_px // 2, fill=255)
    im.paste(grad, (x0, y0), mask)
    d.rounded_rectangle([x0, y0, x1, y0 + cap_h], radius=cap_h // 2, outline=(230, 215, 192), width=2)

    item_w = (x1 - x0) / 4
    icon_s = 104 * S
    for i, (zh, tab) in enumerate(TABS):
        active = i == SELECTED
        cx = x0 + item_w * (i + 0.5)
        ic = load_icon(tab, active, None if tab == 'records' else did).resize((icon_s, icon_s), Image.Resampling.LANCZOS)
        iy = y0 + int(15.5 * S)
        im.paste(ic, (int(cx - icon_s / 2), iy), ic)
        f = font(int(22 * S * 0.92))
        tw = d.textlength(zh, font=f)
        d.text((cx - tw / 2, iy + icon_s + 6 * S - 6 * S), zh, fill=INK_ACTIVE if active else INK, font=f)
    return im


def main() -> None:
    bars = [bar(did) for did in DIRS]
    lab_w = 260
    W = lab_w + bars[0].width + 20
    H = sum(b.height + 16 for b in bars) + 70
    im = Image.new('RGB', (W, H), PAGE_PX)
    d = ImageDraw.Draw(im)
    d.text((16, 14), '底栏实景对照（测试 tab 选中；记录为未改动的现行图标）', fill=INK, font=font(34))
    y = 70
    for did, b in zip(DIRS, bars):
        d.text((16, y + b.height // 2 - 16), DIR_LABELS[did], fill=INK, font=font(26))
        im.paste(b, (lab_w, y))
        y += b.height + 16
    out = SHEETS / 'mock-tabbar-5up.png'
    im.save(out)
    print(f'→ {out.relative_to(ROOT)}')

    # 每方案单张(放大更好看细节)
    for did in DIRS:
        b = bar(did)
        (SHEETS / f'mock-{did}.png').exists() and None
        b.save(SHEETS / f'mock-{did}.png')
    print(f'→ sheets/mock-<id>.png × {len(DIRS)}')


if __name__ == '__main__':
    main()
