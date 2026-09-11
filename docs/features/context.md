# 工作记录

- 时间：2026-09-11 17:10
- 原因：塔罗流程层与全包软陶风格断裂；用户拍板 C 方案（奶油色神秘学）+ 旧暗色做成可切换皮肤 + 双入场动画；后续追加：clay 皮肤设计为「猫咪占卜屋」全新场景（主角猫桌对面实时抽牌、气泡指引），帘幕动画机制两皮肤复用。
- 修改：
  - 新增 `features/tarot/tarotSkin.ts`（偏好 storage `ptking_tarot_skin`，clay 默认/classic）、`tarotSkinCopy.ts`（分皮肤指引文案，猫口吻）；`tarotAssets.ts` 四 getter 加 skin 参数（clay → `-clay` 文件名，每套 24 张预载）。
  - `MiniappTarotFlow.scss` 1765 行颜色抽成 ~80 个 `--tarot-*` 变量（默认=classic 现值），`.miniapp-tarot.skin-clay` 奶油色板覆盖 + 猫气泡 hint 样式；牌背/牌面消费组件（Card/Shuffle/Cut/Fan/ReadingBody）接 skin。
  - 入口页 `pages/tarot/index.tsx` 帘幕状态机（closing 420ms → 帘后挂载流程 → hold 260ms → opening 560ms；clay 奶油帘/classic 入梦暗场星点月牙）+「牌桌」皮肤选择区（缩略图预览 + `tarot_skin_change` 埋点）；reduced-motion 直接切换不播。
  - 24 张 clay 资产生成落包：圣殿=奶油猫占卜屋场景（上猫下空桌+水晶球蜡烛）、牌背=陶土菱纹罗盘星、22 张 majors 全套软陶化（敏感牌温柔化：死亡=化茧成蝶、恶魔=小猫护零食、高塔=撑伞飘落）；愚者/月亮/太阳用 gpt-5.4-image-2 样牌（1024×1536，158KB 内），其余 19 张 gemini-3-pro-image-preview（848×1264）。
  - `publish-assets.mjs` 清单 24→48 张；`cos-assets.md` 更新；`tarotAssets.test.ts` 双皮肤断言、`tarotSkin.test.ts`、`tarotSkinCopy.test.ts` 新增。
  - 生图注：中转站 gpt-5.4-image-2 i2i 2K 大请求持续 terminated（并发 1 也挂），Gemini 4/4 稳定且 $0.02/张；TinyPNG 三 key 全 429 后改 PIL 本地压缩。
- 验证：`npx vitest run src/features/tarot` 53/53 过；`tsc --noEmit` 塔罗相关零错误；`build:weapp` 成功且产物注入 `TARO_ASSET_DEV_BASE_URL`；`assets:check` 48 张齐全、单图 ≤180KB。待微信开发者工具预览两套皮肤全流程 + 用户验收后 COS 上传。

- 时间：2026-09-09 17:20
- 原因：纠正「裁切保留投影」误导。
- 修改：`miniapp-kit.md` 改为白底泛洪抠图标；卡片质感用 CSS `--shadow-card`。

- 时间：2026-09-09 17:05
- 原因：从 ui-4 裁图标时必须保留软投影。
- 修改：`miniapp-kit.md` 视觉风格补充：禁止白底泛洪抠掉投影。

- 时间：2026-09-09 17:00
- 原因：用户选定 ui-4 软陶毡面为全包插画锚点。
- 修改：`miniapp-kit.md` 增补视觉风格：软陶/毡面 3D、色板、品牌栏字画进图、底栏四枚固定物件。
