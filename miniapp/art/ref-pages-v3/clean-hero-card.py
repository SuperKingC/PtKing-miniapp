# 一次性:hero-card 横幅残影清理(精确规则版)——面板内部不动。
# 残影成因:从参考稿裁卡时把面板烘焙软影的直边一起裁进来(用户截图的"方框")。
# 规则:左 x0 / 右 x669+ 整列置透明;底部 y>=305 仅保留 alpha>=200 的实体
# (面板底缘与云朵),清掉 alpha<200 的灰影带;顶部本就只有猫头,不动。
# 用法: python clean-hero-card.py [in.png] [out.png]
import sys
import numpy as np
from PIL import Image

src = sys.argv[1] if len(sys.argv) > 1 else '../../src/assets/illus/hero-card-v4.png'
dst = sys.argv[2] if len(sys.argv) > 2 else '../../src/assets/illus/hero-card-v5.png'

im = Image.open(src).convert('RGBA')
a = np.array(im).astype(int)
H, W = a.shape[:2]
al = a[..., 3].copy()

removed = 0
# 左残线:x0 一列(暖灰实体线,面板蓝从 x1 起)
m = al[:, 0] > 0
removed += m.sum(); al[:, 0] = 0
# 右残线:x669 起
m = al[:, 669:] > 0
removed += m.sum(); al[:, 669:] = 0
# 底部灰影带:y>=305 中 alpha<200 的半透明残影(云底/面板缘 alpha>=200 保留)
strip = al[305:, :]
m = (strip > 0) & (strip < 200)
removed += m.sum(); strip[m] = 0
al[305:, :] = strip
print('removed px:', removed)

out = a.copy()
out[..., 3] = al
res = out.astype('uint8')
Image.fromarray(res, 'RGBA').save(dst)
print('saved', dst, res.shape)

# 预览:合成在奶油底上 + 四边放大
bg = Image.new('RGBA', (W, H), (247, 244, 238, 255))
bg.alpha_composite(Image.fromarray(res, 'RGBA'))
bg.convert('RGB').save('_hero_clean_preview.png')
for name, box in {
    '_clean_left': (0, 90, 50, 230),
    '_clean_bottom': (0, 270, 340, 312),
    '_clean_bottomr': (340, 250, 675, 312),
    '_clean_top': (380, 0, 675, 100),
}.items():
    c = bg.crop(box)
    c = c.resize(((box[2] - box[0]) * 3, (box[3] - box[1]) * 3), Image.NEAREST)
    c.convert('RGB').save('%s.png' % name)
print('previews written')
