"""「我的」v6 五组方案对照图 + 实景底栏 + 真实尺寸检查。

列 = 5 个完整方案(g6a-e),行 = 未选中 / 选中,另附测测子角色锚行。
另出:
  sheets/me-v6-mock-tabbar.png   每组一条真实比例底栏(我的 tab 选中,其余三枚现行不动)
  sheets/me-v6-realsize.png      真实 52px 显示尺寸下五组对比(判断肉垫辨识度)
用法:python sheet-me-pose6.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
PREPARED = ROOT / 'prepared'
PKG = ROOT.parents[1] / 'src/assets/tabbar'
OUT = ROOT / 'sheets'
OUT.mkdir(exist_ok=True)

GROUPS = ['a', 'b', 'c', 'd', 'e']
GLAB = {
    'a': 'A 标准头身比', 'b': 'B 头大更圆·矮胖', 'c': 'C 身体修长·前腿清晰',
    'd': 'D 圆润敦实·臀部饱满', 'e': 'E 细节更少·造型概括',
}
ICON = 210
PAD = 16
ROWLAB = 250
CAPSULE = (243, 229, 209)
PAGE = (254, 250, 245)
INK = (111, 97, 82)


def font(size: int) -> ImageFont.FreeTypeFont:
    for name in ('msyh.ttc', 'simhei.ttf'):
        p = Path('C:/Windows/Fonts') / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def fit(p: Path, size: int = ICON) -> Image.Image:
    im = Image.open(p).convert('RGBA')
    im.thumbnail((size, size), Image.Resampling.LANCZOS)
    c = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    c.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    return c


def candidates_sheet() -> Path:
    cw = ch = ICON + 2 * PAD
    rows = [
        ('未选中', [PREPARED / f'icon-tab-me-g6{g}.png' for g in GROUPS]),
        ('选中（猫左手抬起）', [PREPARED / f'icon-tab-me-active-g6{g}.png' for g in GROUPS]),
        ('【测测子角色锚】', [ROOT / 'char-ref.local.jpg'] * len(GROUPS)),
    ]
    title = '「我的」v6 五组完整方案 — 列=方案 · 行=两状态（每组都可整体接包）'
    tmp = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    W = max(ROWLAB + cw * len(GROUPS) + PAD, int(tmp.textlength(title, font=font(28))) + 2 * PAD)
    H = 52 + 34 + ch * len(rows) + PAD
    im = Image.new('RGB', (W, H), PAGE)
    d = ImageDraw.Draw(im)
    d.text((PAD, 14), title, fill=INK, font=font(28))
    for c, g in enumerate(GROUPS):
        lab = GLAB[g]
        tw = d.textlength(lab, font=font(19))
        d.text((ROWLAB + c * cw + (cw - tw) / 2, 52 + 4), lab, fill=INK, font=font(19))
    for r, (rlab, files) in enumerate(rows):
        y = 52 + 34 + r * ch
        d.text((10, y + ch / 2 - 12), rlab, fill=INK, font=font(19))
        for c, p in enumerate(files):
            x = ROWLAB + c * cw
            d.rounded_rectangle([x + PAD // 2, y, x + cw - PAD // 2, y + ch - PAD // 2], radius=22, fill=CAPSULE)
            ic = fit(p)
            im.paste(ic, (x + (cw - ICON) // 2, y + (ch - PAD // 2 - ICON) // 2), ic)
    out = OUT / 'me-v6-five-groups.png'
    im.save(out)
    print(f'→ {out.relative_to(ROOT)}')
    return out


def mock_tabbar() -> None:
    S = 2
    PAGE_PX = (254, 250, 245)
    CAP_TOP, CAP_BOT = (253, 246, 232), (236, 222, 202)
    INK2, INK_ACT = (111, 97, 82), (184, 112, 62)
    tabs = [('测试', 'test', 'v17s'), ('塔罗', 'tarot', 'v18s'), ('记录', 'records', 'v17s'), ('我的', 'me', 'v17s')]

    def bar(g: str | None):
        W, cap_h, H = 750 * S, 167 * S, 200 * S
        im = Image.new('RGB', (W, H), PAGE_PX)
        d = ImageDraw.Draw(im)
        x0, x1, y0 = 28 * S, W - 28 * S, 16 * S
        col = Image.new('RGB', (1, cap_h))
        for i in range(cap_h):
            t = i / (cap_h - 1)
            col.putpixel((0, i), tuple(int(CAP_TOP[c] + (CAP_BOT[c] - CAP_TOP[c]) * t) for c in range(3)))
        grad = col.resize((x1 - x0, cap_h), Image.Resampling.BILINEAR)
        mask = Image.new('L', grad.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, grad.size[0] - 1, grad.size[1] - 1], radius=cap_h // 2, fill=255)
        im.paste(grad, (x0, y0), mask)
        d.rounded_rectangle([x0, y0, x1, y0 + cap_h], radius=cap_h // 2, outline=(230, 215, 192), width=2)
        item_w, icon_s = (x1 - x0) / 4, 104 * S
        for i, (zh, tab, ver) in enumerate(tabs):
            active = i == 3
            cx = x0 + item_w * (i + 0.5)
            if tab == 'me' and g is not None:
                src = PREPARED / f'icon-tab-me{"-active" if active else ""}-g6{g}.png'
            else:
                src = PKG / f'icon-tab-{tab}{"-active" if active else ""}-{ver}.png'
            ic = Image.open(src).convert('RGBA').resize((icon_s, icon_s), Image.Resampling.LANCZOS)
            iy = y0 + int(15.5 * S)
            im.paste(ic, (int(cx - icon_s / 2), iy), ic)
            fnt = font(int(22 * S * 0.92))
            tw = d.textlength(zh, font=fnt)
            d.text((cx - tw / 2, iy + icon_s), zh, fill=INK_ACT if active else INK2, font=fnt)
        return im

    rows = [(GLAB[g], bar(g)) for g in GROUPS] + [('现行 v17s', bar(None))]
    lab_w = 250
    W = lab_w + rows[0][1].width + 20
    H = sum(b.height + 12 for _, b in rows) + 66
    im = Image.new('RGB', (W, H), PAGE_PX)
    d = ImageDraw.Draw(im)
    d.text((16, 14), '「我的」v6 五组实景底栏（我的 tab 选中；其余三枚现行不动）', fill=INK2, font=font(30))
    y = 62
    for lab, b in rows:
        d.text((16, y + b.height // 2 - 13), lab, fill=INK2, font=font(23))
        im.paste(b, (lab_w, y))
        y += b.height + 12
    out = OUT / 'me-v6-mock-tabbar.png'
    im.save(out)
    print(f'→ {out.relative_to(ROOT)}')

    # 真实显示尺寸 52px
    REAL, S2 = 52, 5
    T = REAL * S2
    files = []
    for g in GROUPS:
        files.append((PREPARED / f'icon-tab-me-g6{g}.png', f'{g} 未选'))
        files.append((PREPARED / f'icon-tab-me-active-g6{g}.png', f'{g} 选中'))
    im2 = Image.new('RGB', (T * len(files) + 14 * (len(files) + 1), T + 66), CAPSULE)
    d2 = ImageDraw.Draw(im2)
    for i, (p, lab) in enumerate(files):
        sm = Image.open(p).convert('RGBA').resize((REAL, REAL), Image.Resampling.LANCZOS)
        big = sm.resize((T, T), Image.Resampling.NEAREST)
        x = 14 + i * (T + 14)
        im2.paste(big, (x, 40), big)
        d2.text((x, 10), lab, fill=(70, 60, 50), font=font(18))
    out2 = OUT / 'me-v6-realsize.png'
    im2.save(out2)
    print(f'→ {out2.relative_to(ROOT)}')


if __name__ == '__main__':
    candidates_sheet()
    mock_tabbar()
