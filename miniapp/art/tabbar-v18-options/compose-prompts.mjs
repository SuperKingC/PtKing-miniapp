// 底栏图标「五组方案」提示词生成(2026-09-12)
// 需求:除「记录」外(测试/塔罗/我的)重新生图,每 tab 两个状态(未选中/选中),出 5 组方案给用户挑。
//
// 组合模型 = 概念(锁定, 见 docs/features/miniapp-kit.md) × 状态(2) × 渲染方向(5)。
//   概念锁定不动:测试=猫从测验纸后探头 / 塔罗=三张叠牌中央月牙 / 我的=正面坐姿奶油猫。
//   5 个方向只改「渲染语言」(配色/体积/细节量),让方案之间可比又有真差异,不推翻已验证的造型。
// 产物 prompts.txt 每行 `name|提示词`,name 形如 icon-tab-test-v18a(未选中) / icon-tab-test-active-v18a(选中)。
//
// 用法:node compose-prompts.mjs   → 覆写 prompts.txt
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

// —— 风格锚(与 art.config / prompts.txt 头注释一致;v14s/v17s 同源) ——
const STYLE = [
  '高调奶油软陶 3D 治愈插画(claymorphism)',
  '锚点为 2026-09-11 ref-pages-v3 reference-ui: 哑光聚合软陶, 表面干净光滑细腻带细纸纹微粒, 毡面纤维感弱, 圆润饱满, 无硬描边',
  '高调影棚光, 环境光足, 阴影浅而弥散, 不要浓毡纤维不要暗调重影, 不要水彩勾线不要彩铅排线不要扁平矢量色块',
  '色板: 奶油白/燕麦#F7F4EE/米色胶囊#E9DFD0/水感雾蓝(亮)/奶杏陶土(淡)/浅金褐. 极简治愈, 高级感',
].join('. ')

// —— 通用前后缀(与 v14s/v17s 一致,保证抠图与归一可复用) ——
const PRE = '只要一枚底部小图标, 不要界面不要底栏胶囊不要卡片不要成对'
const POST = '纯白背景, 无底板无胶囊, 单个图标居中, 主体约占四分之三, 主体外接框接近正方形, 无描边, 无文字。细腻毡面颗粒有体积'

// —— 概念 × 状态:三枚 tab 的主体描述(未选中安静 / 选中点亮) ——
const CONCEPTS = {
  test: {
    unselected: '一张圆角厚测验纸微微斜立, 一只奶油色小猫从纸后探出圆头, 一只前爪搭在纸边, 纸面三道浅凹槽, 纸右上角一颗极小雾蓝星, 猫安静圆眼',
    selected: '一张圆角厚测验纸微微斜立, 一只奶油色小猫从纸后探出圆头, 一只前爪搭在纸边, 纸面三道凹槽从内透出暖光像小夜灯, 猫舒服眯眼加两团圆腮红',
  },
  tarot: {
    unselected: '三张圆角塔罗牌紧紧叠成一叠只微微错开小角度, 左右两张各露出窄窄一条边为雾蓝牌背干净无纹, 中间一张完整为陶土橘牌面, 牌面中央一枚凹陷奶油色月牙, 月牙安静不发光',
    selected: '三张圆角塔罗牌像扇子只稍微张开一个小角度, 左右两张各露出窄窄一条边为雾蓝牌背, 中间一张完整为陶土橘牌面, 牌面中央一枚奶油色月牙浮雕像小夜灯亮起柔和暖光, 光晕淡淡染在左右牌背',
  },
  me: {
    unselected: '一只圆润小猫正面坐姿, 两只前爪收在身前, 圆头小耳朵, 毛色暖杏驼色带浅橘条纹, 安静圆眼',
    selected: '一只圆润小猫正面坐姿, 圆头小耳朵, 一只前爪收在身前, 另一只前爪高高抬起像在打招呼, 掌心一团粉色肉垫清晰可见, 眯眼两团圆腮红, 像小暖灯微微发光',
  },
}

// —— 5 个渲染方向:只改配色/体积/细节语言,造型保持一致;unselected/selected 各自给匹配的措辞 ——
const DIRECTIONS = [
  {
    id: 'v18a',
    label: 'A 现版精修·高对比',
    unselected: '主体用明显深于米色胶囊#E9DFD0 两档的暖褐焦糖色(约#d9a978), 轮廓边缘一圈更深一档的描影让形状清晰, 细节干净中等',
    selected: '主体换饱和陶土橘并点亮暖光, 轮廓边缘一圈更深一档的描影让形状清晰, 细节干净中等',
  },
  {
    id: 'v18b',
    label: 'B 暖陶土甜暖',
    unselected: '整体更暖更甜, 主色为烤杏焦糖色(约#dfa76b)配奶白点缀, 暖调高调光, 像刚出炉的饼干',
    selected: '主色换饱和暖橘并被暖光点亮, 配奶白点缀, 暖调高调光, 像刚出炉的饼干',
  },
  {
    id: 'v18c',
    label: 'C 粉雾蓝清凉',
    unselected: '主色为粉雾蓝(约#b6cddd)配奶油白, 清爽柔和, 冷调高调光',
    selected: '主体仍偏粉雾蓝但被一盏暖橘小夜灯点亮, 冷底暖光对比, 清爽柔和',
  },
  {
    id: 'v18d',
    label: 'D 厚体积胖软陶',
    unselected: '造型更圆润厚重饱满, 体块感更强, 圆角更大, 浅环境遮蔽, 柔和影棚光, 像手捏的胖软陶, 底部接触影明显',
    selected: '造型同样圆润厚重饱满, 被暖光点亮, 体块感更强, 圆角更大, 浅环境遮蔽, 柔和影棚光, 像手捏的胖软陶, 底部接触影明显',
  },
  {
    id: 'v18e',
    label: 'E 极简符号',
    unselected: '细节减到最少, 大色块圆角剪影, 单一主色加一处小点缀, 造型概括干净, 几乎无内部细节',
    selected: '细节减到最少, 大色块圆角剪影, 主色加暖光点缀, 造型概括干净, 几乎无内部细节',
  },
]

const lines = []
lines.push('# 底栏图标 v18 五组方案(2026-09-12):测试/塔罗/我的 × 未选中选中 × 5 渲染方向 = 30 张候选。')
lines.push('# 概念锁定(见 docs/features/miniapp-kit.md);仅渲染语言分方向。记录(records)本轮不动。')
lines.push('# 由 compose-prompts.mjs 生成,勿手改;要调改脚本。')
lines.push(`STYLE=${STYLE}`)
lines.push('')

for (const dir of DIRECTIONS) {
  lines.push(`# —— 方案 ${dir.label} (${dir.id}) ——`)
  for (const tab of ['test', 'tarot', 'me']) {
    const c = CONCEPTS[tab]
    // 未选中
    lines.push(`icon-tab-${tab}-${dir.id}|${PRE}。{STYLE} ${c.unselected}。${dir.unselected}。${POST}`)
    // 选中
    lines.push(`icon-tab-${tab}-active-${dir.id}|${PRE}。{STYLE} ${c.selected}。${dir.selected}。${POST}`)
  }
  lines.push('')
}

fs.writeFileSync(path.join(root, 'prompts.txt'), lines.join('\n'), 'utf8')
const count = lines.filter((l) => l && !l.startsWith('#') && !l.startsWith('STYLE=')).length
console.log(`compose-prompts: 写入 ${count} 条提示词 → prompts.txt`)
