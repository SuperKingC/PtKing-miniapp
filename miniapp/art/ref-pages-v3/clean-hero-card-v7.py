# 一次性:hero-card v7 alpha 剖面重建——修左下圆角接缝与云底毛糙。
# 病根:v6「超采样软 alpha」把整条直边变成 2px 半透明渐变(左 x0-x1 全列
# alpha~65-100%,右 x668-669 全列羽化),底缘拖出 y306→y311 共 6 行羽化尾
# (v5 原是干净硬边),页面上呈发虚毛边,圆角转直边处 alpha 突变更显眼。
# 规则:实色内容一概不动(面板/云/烘焙投影/文字全保留),只重建外圈剖面——
#   1) solid = alpha>=200 的实心核心;
#   2) 紧贴 solid 的 1px 外圈:原 alpha>=60 的保留原值作抗锯齿过渡;
#   3) 更外圈一律清零(羽化尾巴全部剪掉)。
# 结果:剖面 = 255 实色 → 1px 过渡 → 0,左右底三边同步收敛 1-2px。
# 用法: python clean-hero-card-v7.py [in.png] [out.png]
import sys
import numpy as np
from PIL import Image

src = sys.argv[1] if len(sys.argv) > 1 else '../../src/assets/illus/hero-card-v6.png'
dst = sys.argv[2] if len(sys.argv) > 2 else '../../src/assets/illus/hero-card-v7-raw.png'

im = Image.open(src).convert('RGBA')
a = np.array(im).astype(int)
al = a[..., 3].copy()
H, W = al.shape

solid = al >= 200

# 4 邻域膨胀(solid 相邻一圈),纯 numpy 无 scipy 依赖
adj = np.zeros_like(solid)
adj[1:, :] |= solid[:-1, :]
adj[:-1, :] |= solid[1:, :]
adj[:, 1:] |= solid[:, :-1]
adj[:, :-1] |= solid[:, 1:]
ring = adj & ~solid  # 紧贴实心的 1px 外圈

out_al = np.zeros_like(al)
out_al[solid] = 255
keep = ring & (al >= 60)
out_al[keep] = al[keep]

removed = int((al > 0).sum() - (out_al > 0).sum())
retimed = int(keep.sum())
print(f'removed px: {removed}, ring kept: {retimed}, total opaque: {(out_al>0).sum()}')

out = a.copy()
out[..., 3] = out_al
res = out.astype('uint8')
Image.fromarray(res, 'RGBA').save(dst)
print('saved', dst, res.shape)

# 预览:合成奶油底 + 两处问题区放大(左下圆角、右下云)+ 三边剖面复查
bg = Image.new('RGBA', (W, H), (247, 244, 238, 255))
bg.alpha_composite(Image.fromarray(res, 'RGBA'))
rgb = bg.convert('RGB')
rgb.save('_hero7_clean_preview.png')
for name, box in {
    '_hero7_leftbottom': (0, 220, 120, 312),
    '_hero7_rightcloud': (420, 240, 675, 312),
}.items():
    c = rgb.crop(box)
    c = c.resize(((box[2] - box[0]) * 4, (box[3] - box[1]) * 4), Image.NEAREST)
    c.save('%s.png' % name)

r = out_al
for label, sl, axis in [('left x0-2', r[:, 0:3], 0), ('right x666-669', r[:, 666:670], 0), ('bottom y306-311', r[306:312, :], 1)]:
    solid_n = (sl == 255).sum()
    ring_n = ((sl > 0) & (sl < 255)).sum()
    print(f'{label}: solid={solid_n} ring={ring_n}')
print('previews written')
