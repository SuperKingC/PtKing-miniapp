# 测试条气球/公文包 tile 阴影统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从 v20 主体输入生成与 love/star 同一外部软影契约的 fun/career v23 资产，并更新页面引用、像素测试和构建验证。

**Architecture:** 资产处理脚本负责主体 mask、抗锯齿和参考影带映射，输出带烘焙外部软影的 172×172 PNG；页面继续将 tile 作为普通文档流图片并保持 `filter: none`。Vitest 直接解码最终 PNG，分别验证主体结构、主体外空气影和页面引用，防止“内部棱通过但没有外部影”的回归。

**Tech Stack:** Python 3 + Pillow/numpy（资产处理），Node.js TinyPNG 压缩脚本，Taro/React/SCSS，Vitest + pngjs。

---

### Task 1: 将像素契约改成能捕获“外部影缺失”的失败测试

**Files:**
- Modify: `miniapp/src/config/tileShadow.test.ts`
- Test input: `miniapp/src/assets/illus/tile-love-v10.png`, missing targets `tile-fun-v23.png` and `tile-career-v23.png`

- [ ] **Step 1: 把目标版本改为 v23，并保留 v22 仅作为历史对照注释**

将 `TILES` 改为：

```ts
const TILES = [
  'src/assets/illus/tile-fun-v23.png',
  'src/assets/illus/tile-career-v23.png',
]
```

在文件头注释中明确：参考 tile 的影带在主体外，禁止仅用主体内部亮度峰值代替外部影。

- [ ] **Step 2: 增加可重复的主体/外部影测量函数**

在现有 `solidBox` 后加入以下职责分离的函数：

```ts
function bodyBox(img: ReturnType<typeof decode>) {
  const points: Array<[number, number]> = []
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (img.alpha[y * img.width + x] >= 240) points.push([x, y])
    }
  }
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

function outsideShadowProfile(rel: string, side: 'bottom' | 'left', depth = 14) {
  const img = decode(rel)
  const box = bodyBox(img)
  const values: number[] = []
  if (side === 'bottom') {
    const xa = box.x0 + Math.floor((box.x1 - box.x0) / 3)
    const xb = box.x1 - Math.floor((box.x1 - box.x0) / 3)
    for (let d = 1; d <= depth; d += 1) {
      const y = box.y1 + d
      values.push(y >= img.height ? 0 : Math.max(0, PAGE_MEAN - img.lum[y * img.width + Math.round((xa + xb) / 2)]))
    }
  } else {
    const ya = box.y0 + Math.floor((box.y1 - box.y0) / 3)
    const yb = box.y1 - Math.floor((box.y1 - box.y0) / 3)
    for (let d = 1; d <= depth; d += 1) {
      const x = box.x0 - d
      values.push(x < 0 ? 0 : Math.max(0, PAGE_MEAN - img.lum[Math.round((ya + yb) / 2) * img.width + x]))
    }
  }
  return values
}
```

采样固定使用主体中段的空白 tile 区域；气球与公文包物件均位于中心偏上，底缘/左缘三分之一中段不会与物件相交。

- [ ] **Step 3: 写出会在 v22/缺少 v23 时失败的外部影断言**

加入：

```ts
it('主体外有与 love 同向的左/下空气影，而不是只有内部棱', () => {
  const refBottom = outsideShadowProfile(REF, 'bottom')
  const refLeft = outsideShadowProfile(REF, 'left')
  for (const rel of TILES) {
    const bottom = outsideShadowProfile(rel, 'bottom')
    const left = outsideShadowProfile(rel, 'left')
    expect(Math.max(...bottom), rel).toBeGreaterThan(Math.max(...refBottom) * 0.65)
    expect(Math.max(...left), rel).toBeGreaterThan(Math.max(...refLeft) * 0.55)
    expect(bottom.some((v, i) => v > 0 && i >= 3), rel).toBe(true)
  }
})
```

同时把“实体外无 alpha 平板”的断言收窄为“无贯穿式矩形平板”，允许参考影带存在；检查影带边界的连续 alpha 和横向覆盖率，不允许同一行从主体左侧到右侧全部拥有近似相同 alpha。

- [ ] **Step 4: 运行聚焦测试，确认 RED**

Run: `npm --prefix miniapp run test -- src/config/tileShadow.test.ts`

Expected: FAIL，因为 v23 文件尚不存在；若测试未因缺少目标文件失败，修正目标路径或解码错误后再继续。

### Task 2: 编写 v23 资产重组脚本并生成无损中间图

**Files:**
- Create: `miniapp/art/ref-pages-v3/compose-tiles-v23.py`
- Create: `miniapp/art/ref-pages-v3/prepared/tile-fun-v23.png`
- Create: `miniapp/art/ref-pages-v3/prepared/tile-career-v23.png`

- [ ] **Step 1: 固定输入、输出和参考剖面**

脚本固定读取：

```py
SOURCE = {
    'fun': SRC_DIR / 'tile-fun-v20.png',
    'career': SRC_DIR / 'tile-career-v20.png',
}
REFERENCE = SRC_DIR / 'tile-love-v10.png'
OUTPUT = {
    'fun': PREP_DIR / 'tile-fun-v23.png',
    'career': PREP_DIR / 'tile-career-v23.png',
}
CANVAS = 172
PAGE = np.array([254.0, 250.0, 244.0])
```

脚本不得读取 v22，也不得覆盖 v22 文件。

- [ ] **Step 2: 从 v20 清除底部平板并建立连续主体 alpha**

对 v20 alpha 做连通区域筛选：保留从主体 bbox 内部连通到圆角 tile 的区域，清除 y 方向贯穿到底的固定 alpha≈74/82 平板；用 8 倍超采样圆角 mask 和覆盖率下采样得到至少 8 个半透明边缘等级。主体 bbox 需要保持在 172×172 画布内，中心相对 love/star 的偏差不超过 3px。

- [ ] **Step 3: 保留 v20 的主体 RGB 与物件细节**

在主体 mask 内保留气球、公文包、把手、扣件和表面颗粒，只对旧版外缘做颜色/alpha 清理；禁止用单一平面色覆盖主体。

- [ ] **Step 4: 从 love 提取并映射外部影带**

用参考图主体 bbox 与页面色分离出主体外 alpha 和合成 RGB；以主体中段的下缘/左缘为采样段，将参考影带归一化到新主体 bbox，采用连续坐标采样。影带方向固定为左/下，紧邻主体处最实，向外 10～14px 平滑衰减，上/右不复制影。

- [ ] **Step 5: 合成主体覆盖影层并打印测量值**

先合成外部影，再用主体 alpha src-over 覆盖；打印主体 bbox、下缘/左缘影峰位与峰值、上/右外侧亮度，便于与测试输出核对。保存无损 RGBA PNG 到 `prepared/`。

- [ ] **Step 6: 执行脚本并做静态检查**

Run: `python miniapp/art/ref-pages-v3/compose-tiles-v23.py`

Expected: 生成两张 172×172 PNG；脚本输出主体 bbox 与影带测量值；`prepared/` 中没有固定矩形 alpha 尾巴。

### Task 3: 压缩 v23 并替换页面引用

**Files:**
- Create: `miniapp/art/ref-pages-v3/compress-tiles-v23.mjs`
- Create: `miniapp/src/assets/illus/tile-fun-v23.png`
- Create: `miniapp/src/assets/illus/tile-career-v23.png`
- Modify: `miniapp/src/pages/test/index.tsx`
- Modify: `miniapp/src/pages/records/index.tsx`
- Modify: `miniapp/src/pages/test/index.test.ts`
- Modify: `miniapp/src/pages/records/index.test.ts`

- [ ] **Step 1: 复制 v22 压缩脚本并锁定 v23 文件名**

脚本只读取 `prepared/tile-fun-v23.png`、`prepared/tile-career-v23.png`，沿用 kit `.env` 中的 TinyPNG key 读取方式，输出到 `miniapp/src/assets/illus/`；遇到压缩后超过 180KB 立即失败。

- [ ] **Step 2: 运行压缩脚本并检查资产**

Run: `node miniapp/art/ref-pages-v3/compress-tiles-v23.mjs`

Expected: 两张 v23 资产落包，尺寸 ≤180KB，PNG 透明通道保留。

- [ ] **Step 3: 更新两个页面的 import 与版本契约**

把测试中心和记录页的 `tile-fun-v22.png` / `tile-career-v22.png` 改为 v23；保留 v22 旧资源和回滚路径，不改 `.test-page__card-spot` 的 `filter: none`。

- [ ] **Step 4: 更新页面测试并运行页面聚焦测试**

将测试断言改为 v23，并继续断言不引用旧 v13/v22 路径。运行：

```bash
npm --prefix miniapp run test -- src/config/tileShadow.test.ts src/pages/test/index.test.ts src/pages/records/index.test.ts
```

Expected: 三个测试文件全部 PASS。

### Task 4: 资产视觉回归、构建与提交

**Files:**
- Verify: `miniapp/src/assets/illus/tile-fun-v23.png`
- Verify: `miniapp/src/assets/illus/tile-career-v23.png`
- Verify: `miniapp/dist/`

- [ ] **Step 1: 运行完整测试**

Run: `npm run test`

Expected: 全部 Vitest 测试 PASS。

- [ ] **Step 2: 清缓存并生成 fresh dist**

Run: `npm run build:weapp`

Expected: `miniapp/dist` 成功生成，构建产物包含 v23 资源；不要使用旧 dist 截图作为验收依据。

- [ ] **Step 3: 在微信开发者工具 fresh 预览**

清理构建缓存后打开测试中心和记录页，逐项检查：气球/公文包与 love/star 的底部接触影、左缘软影、外部衰减、圆角抗锯齿、表面颗粒、无白板/双影/蓝灰脏棱。记录预览入口和未验区域。

- [ ] **Step 4: 只暂存本任务文件并提交**

提交前运行：

```bash
git status --short
git diff --check
git add -- miniapp/art/ref-pages-v3/compose-tiles-v23.py miniapp/art/ref-pages-v3/compress-tiles-v23.mjs miniapp/src/assets/illus/tile-fun-v23.png miniapp/src/assets/illus/tile-career-v23.png miniapp/src/pages/test/index.tsx miniapp/src/pages/records/index.tsx miniapp/src/pages/test/index.test.ts miniapp/src/pages/records/index.test.ts miniapp/src/config/tileShadow.test.ts
git commit -m "统一测试条气球公文包 tile 阴影"
```

不得使用 `git add -A` 或 `git add .`；规格文档已经由前一提交完成，本次提交只包含实现与验证相关文件。
