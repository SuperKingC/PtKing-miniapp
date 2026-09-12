"""tabbar v18 五组方案对照图:把 prepared/ 的候选图标排成两种视图,便于挑方案。

- 每方案一图(prepared/../sheets/dir-<id>.png):3 tab × 2 状态 = 6 格,一个方向看清整组是否同构。
- 每槽位一图(sheets/slot-<tab>-<state>.png):同一槽位的 5 个方向横排,直接比选。

图标统一贴在米色胶囊底 #f3e5d1 的圆角块上模拟底栏实景(透明白底看不见造型)。
用法:python contact-sheets.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
PREPARED = ROOT / 'prepared'
SHEETS = ROOT / 'sheets'
SHEETS.mkdir(exist_ok=True)

DIRS = ['v18a', 'v18b', 'v18c', 'v18d', 'v18e']
DIR_LABELS = {
    'v18a': 'A 现版精修·高对比', 'v18b': 'B 暖陶土甜暖', 'v18c': 'C 粉雾蓝清凉',
    'v18d': 'D 厚体积胖软陶', 'v18e': 'E 极简符号',
}
TABS = [('test', '测试'), ('tarot', '塔罗'), ('me', '我的')]
STATES = [('', '未选中'), ('-active', '选中')]

CAPSULE = (243, 229, 209)   # #f3e5d1 底栏胶囊色
PAGE = (254, 250, 245)      # #fefaf5 页面底色
INK = (111, 97, 82)
ICON = 200                  # 图标显示边长
PAD = 18
CAP = 26                    # 底部标签行高
TITLE_H = 52


def font(size: int) -> ImageFont.FreeTypeFont:
    for name in ('msyh.ttc', 'msyhbd.ttc', 'simhei.ttf'):
        p = Path('C:/Windows/Fonts') / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def icon(name: str) -> Image.Image:
    p = PREPARED / f'{name}.png'
    if not p.exists():
        raise SystemExit(f'缺 prepared/{name}.png(先生成+跑 prepare-v18.py)')
    return Image.open(p).convert('RGBA').resize((ICON, ICON), Image.Resampling.LANCZOS)


def cell(im: Image.Image, draw: ImageDraw.ImageDraw, box, img: Image.Image, active: bool):
    x, y, w, h = (int(v) for v in box)
    draw.rounded_rectangle([x, y, x + w, y + h], radius=22, fill=CAPSULE)
    if active:
        draw.rounded_rectangle([x, y, x + w, y + h], radius=22, outline=(184, 112, 62), width=3)
    im.paste(img, (x + (w - ICON) // 2, y + (h - CAP - ICON) // 2), img)


def sheet(title: str, header_cols, rows, name_fn) -> Path:
    """rows: 列表,每行 = (行标签, [图标名, ...]);header_cols: 列标题。"""
    cw, ch = ICON + 2 * PAD, ICON + CAP + 2 * PAD
    rowlab_w = 70
    HDR_H = 34
    grid_w = rowlab_w + cw * len(header_cols) + PAD
    tf = font(30)
    tmp = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    title_w = int(tmp.textlength(title, font=tf))
    W = max(grid_w, title_w + 2 * PAD)
    H = TITLE_H + HDR_H + ch * len(rows) + PAD
    im = Image.new('RGB', (W, H), PAGE)
    d = ImageDraw.Draw(im)
    d.text((PAD, 16), title, fill=INK, font=tf)
    for c, htxt in enumerate(header_cols):
        f = font(20)
        tw = d.textlength(htxt, font=f)
        cx = rowlab_w + c * cw + cw / 2
        d.text((cx - tw / 2, TITLE_H + 4), htxt, fill=INK, font=f)
    for r, (rlab, names) in enumerate(rows):
        y = TITLE_H + HDR_H + r * ch
        d.text((10, y + ch / 2 - 12), rlab, fill=INK, font=font(20))
        for c, nm in enumerate(names):
            x = rowlab_w + c * cw
            cell(im, d, (x + PAD / 2, y, cw - PAD, ch - PAD / 2), icon(nm), nm.endswith('-active'))
    out = SHEETS / name_fn
    im.save(out)
    print(f'→ {out.relative_to(ROOT)}')
    return out


def main() -> None:
    for did in DIRS:
        rows = [(zh, [f'icon-tab-{t}{st}-{did}' for st, _ in STATES]) for t, zh in TABS]
        sheet(f'方案 {DIR_LABELS[did]} — 测试/塔罗/我的（左 未选中 · 右 选中）',
              [s for _, s in STATES], rows, f'dir-{did}.png')
    for t, zh in TABS:
        for st, szh in STATES:
            rows = [(did[-1].upper(), [f'icon-tab-{t}{st}-{d}' for d in DIRS])]
            sheet(f'{zh} · {szh} — 五方向对比', [DIR_LABELS[d].split()[0] for d in DIRS],
                  rows, f'slot-{t}{st or ""}.png')

    # 总览:行=5 方案,列=6 槽位,一眼挑组
    cols = [(f'{zh}\n{szh}', f'icon-tab-{t}{st}-{{d}}') for t, zh in TABS for st, szh in STATES]
    overview(DIRS, cols)


def overview(dirs, cols) -> Path:
    cw, ch = ICON + 2 * PAD, ICON + CAP + 2 * PAD
    rowlab_w = 190
    HDR_H = 56
    tf = font(30)
    tmp = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    title = '底栏图标 v18 五组方案总览 — 行=方案 · 列=槽位（记录未动）'
    W = max(rowlab_w + cw * len(cols) + PAD, int(tmp.textlength(title, font=tf)) + 2 * PAD)
    H = TITLE_H + HDR_H + ch * len(dirs) + PAD
    im = Image.new('RGB', (W, H), PAGE)
    d = ImageDraw.Draw(im)
    d.text((PAD, 16), title, fill=INK, font=tf)
    for c, (ctxt, _) in enumerate(cols):
        f = font(20)
        cx = rowlab_w + c * cw + cw / 2
        for li, line in enumerate(ctxt.split('\n')):
            tw = d.textlength(line, font=f)
            d.text((cx - tw / 2, TITLE_H + 2 + li * 24), line, fill=INK, font=f)
    for r, did in enumerate(dirs):
        y = TITLE_H + HDR_H + r * ch
        d.text((10, y + ch / 2 - 12), DIR_LABELS[did], fill=INK, font=font(22))
        for c, (_, pat) in enumerate(cols):
            x = rowlab_w + c * cw
            cell(im, d, (x + PAD / 2, y, cw - PAD, ch - PAD / 2), icon(pat.format(d=did)), pat.endswith('-active}'))
    out = SHEETS / 'overview.png'
    im.save(out)
    print(f'→ {out.relative_to(ROOT)}')
    return out


if __name__ == '__main__':
    main()
