# 功能：COS 资产发布与更新

状态：已上线。桶 `ptking-assets-1300973162`（地域 `ap-guangzhou`），当前版本目录见仓库根 `.asset-base-url`。

塔罗牌、测试题 JSON、报告配图都不进小程序主包，统一放 COS 版本目录，由 `TARO_ASSET_BASE_URL` 热更下发。塔罗运行时拼 `{根}/tarot/...`，两套皮肤各 24 张（classic 无后缀 + clay `-clay` 后缀），共 48 张。

## 密钥放哪里（换电脑必读）

密钥读取优先级（高→低），脚本 `scripts/publish-assets.mjs` 自动加载：

1. 真实环境变量（CI / 临时改指向）
2. **本项目根 `.env`**（已 gitignore，推荐）
3. kit 仓库根 `miniapp-kit/.env`（历史写法，仍兼容）

> ⚠️ `.env` 被 gitignore，**不随 git 同步**。换电脑 / 换工作区后密钥会「丢失」，需从旧机备份或重新新建。
> 腾讯云 SecretKey 只在创建时显示一次，之后控制台无法再查看；丢了只能新建密钥。
> 密钥绝不写进任何入库文件。


## 在腾讯云创建存储桶（一次性）

1. 打开 [COS 存储桶列表](https://console.cloud.tencent.com/cos/bucket)，用已实名的腾讯云账号登录。未开通过对象存储时，按提示开通 COS。
2. 点「创建存储桶」：
   - **名称**：例如 `ptking-assets`（保存后会变成 `ptking-assets-125xxxxxxxx`，后面一串是你的 APPID，不要手改）。
   - **所属地域**：选 **广州**（`ap-guangzhou`），和脚本默认、微信服务器都较近。
   - **访问权限**：选 **公有读私有写**。小程序 `downloadFile` 要能不带签名直接拉图；选「私有读写」真机一定会失败。
   - 版本控制、日志、加密保持默认即可。
3. 创建完成后进入该桶「概览」，复制 **访问域名**，形如：

```text
https://ptking-assets-125xxxxxxxx.cos.ap-guangzhou.myqcloud.com
```

这就是后面的 `COS_PUBLIC_BASE`（不要加末尾 `/`，不要加 `assets/ptking`）。
4. 申请密钥（本仓库不要保存）：访问管理 CAM → [API 密钥管理](https://console.cloud.tencent.com/cam/capi) → 「新建密钥」。得到 `SecretId` / `SecretKey`。能建子用户并只授这个桶的写权限更好；个人开发先用主账号密钥也可以。
5. 安全组/防盗链：桶「安全管理 → 防盗链」先保持关闭。打开后若没放行微信客户端，手机会下不了图。
6. 微信公众平台 → 开发管理 → 开发设置 → **downloadFile 合法域名**，只填主机名，例如 `ptking-assets-125xxxxxxxx.cos.ap-guangzhou.myqcloud.com`（不要 `https://`）。开发者工具可先关「不校验合法域名」做本机调试，真机必须配域名。

然后把下面五项写进**本项目根 `.env`**（推荐）或 `D:\Mine\miniapp-kit\.env`（旧写法，仍兼容）——两处都已 gitignore：

```env
COS_SECRET_ID=...
COS_SECRET_KEY=...
COS_BUCKET=ptking-assets-1300973162
COS_REGION=ap-guangzhou
COS_PUBLIC_BASE=https://ptking-assets-1300973162.cos.ap-guangzhou.myqcloud.com
```

`COS_PUBLIC_BASE` 不要带尾斜杠，不要带 `assets/ptking`。脚本会拼成：

```text
{COS_PUBLIC_BASE}/assets/ptking/{git短SHA}
```

`art.config.json` 的 `output.cos` 保持 `assets/ptking`。塔罗原图已从 Pet10 `public/tarot/` 拷到本地资产目录（gitignore，不入库）。换图覆盖同名文件后执行 `npm run assets:compress`（只 TinyPNG，不降分辨率），再 `npm run assets`。

当前文件（classic 24 张 + clay 皮肤 24 张，clay 由 2026-09-11 新锚点 reference-ui.png 风格生成，猫咪占卜屋场景）：

```text
art/generated-art/tarot/ui/sanctuary-background.jpg
art/generated-art/tarot/ui/card-back.jpg
art/generated-art/tarot/cards/{22 张 majors}.jpg
art/generated-art/tarot/ui/sanctuary-background-clay-v2.jpg
art/generated-art/tarot/ui/card-back-clay-v3.jpg
art/generated-art/tarot/cards/{22 张 majors}-clay.jpg
```

（majors 清单见 `scripts/publish-assets.mjs` 的 `TAROT_FILES`。）

本次 clay UI 资源版本说明：`sanctuary-background-clay-v2.jpg` 来源为 `tarot-bg-long2.png`（背景 2），`card-back-clay-v3.jpg` 来源为 `tarot-clay-cardback-v3a.jpg`（扁平印刷菱格 + 平面八角星，去掉图内投影与立体浮雕星）。牌背文件名升为 `-v3` 防缓存；背景仍用 `-v2`。上传目录仍使用 git SHA 版本目录，48 张清单与 COS 根路径规则不变。

牌面原图像素约 768×1152（clay 批次为 2:3 竖幅），背景约 768×1365。界面上牌面大约 190×300 rpx，真机按 2～3 倍屏也就需要约 400×600 像素。因此：

- **只做 TinyPNG、不降分辨率**：像素不变，主要减 JPEG 体积，观感几乎不变。这是当前做法。
- **适度缩小（例如收到 560×840）**：手机上看不出差别，体积会再小一截。
- **收到显示尺寸（190×300）**：会发糊，不要这样做。

COS 热更图保持与代码锁定的文件名，同名覆盖后靠 `assetRev` + `?r=` 刷新，不必为换图升 `-v4`。只有改代码引用（新增一张、换路径结构）才改文件名。打进主包的插画也可覆盖同名，开发者工具清全部缓存后重编译即可。

## 玩家指针和热更（1.0.0 必读）

小程序里的 `TARO_ASSET_BASE_URL` 在**构建时写死**，例如 `.../assets/ptking/c958df7`。玩家装的 1.0.0 只会去这个目录。

| 你想做的事 | 命令 | COS 目录 | 玩家 1.0.0 |
|---|---|---|---|
| 热更题库 / 覆盖现有图 | `npm run assets:registry` 或 `npm run assets:hot` | **还是** `.asset-base-url` 那个目录 | 对得上 |
| 发下一个小程序版本 | `npm run assets` / 一键上传 | 按 **新 git SHA** 开新目录，并改本地指针、重建 | **对不上**，要等他们更新小程序 |

`npm run assets:channel`（即 `--channel` 不带值）的频道名解析顺序：

1. 显式传入 `--channel v1` 等，直接用
2. 当前分支名含 `release`（不区分大小写），取**最后一段**版本号，例如 `release/1.0.0` → `1.0.0`，`release/v1.0.0` → `v1.0.0`
3. 否则读 git tag（优先打在 HEAD 上的，否则本分支最近的）

推荐在 release 分支上直接上传，不必先打 tag：

```powershell
git switch release/1.0.0
npm run assets:channel
```

会传到 `assets/ptking/1.0.0/`。非 release 分支仍可先 `git tag v1.0.0` 再上传（→ `assets/ptking/v1.0.0/`）。要手写名字仍可用 `npm run assets -- --channel v1`。之后热更用 `assets:hot` 覆盖玩家指针那个目录。`npm run assets` 不带 `--channel` 仍按 git SHA 开新目录，若和当前指针不同会警告。

`npm run assets` / `assets:hot` 会在题库 JSON 里写入 `assetRev`。小程序拉到新修订号后，塔罗图 URL 带 `?r=`，同名覆盖也会重下，**不必为热更换图升文件名、也不必发新版小程序**。只改题目用 `assets:registry`（不写 `assetRev`），避免玩家无谓重下 24 张图。

## 日常更新（一键）

资源放进 `art/generated-art` 后：

- **已上架包热更**（不改指针）：`npm run assets:hot`（图+题库）或 `npm run assets:registry`（只题库）
- **下一个小程序版本**：双击 `一键上传.cmd` 或 `npm run assets`（新 SHA 目录 → 写指针 → 重建）

只热更题库、不改资产根、不重建小程序：

```powershell
npm run assets:registry
```

它会先 `content:export`，再把 JSON 传到 `.asset-base-url` 指向的当前版本目录（短缓存 60s）。小程序每次 `onShow` 拉取 `{资产根}/tests/registry-v1.json`：以包内静态题库为基重放（同 id 覆盖、新 id 追加、COS 上删掉的项消失）；失败仍走静态兜底。换 `registry-v2.json` 必须改代码并重建。

验收热更（不改代码、不重建）：

```powershell
npm run assets:registry:probe
```

微信开发者工具点「编译」或把模拟器切到后台再回来，测试中心应出现「COS 热更探针」。确认后撤回：

```powershell
npm run assets:registry
```

再编译一次，探针应消失。

只想预演或拆开跑：

```powershell
npm run assets:check
npm run assets:upload
npm run assets:publish
```

| 命令 | 作用 |
|---|---|
| `assets:compress` | 对 `art/generated-art/tarot` 做一次 TinyPNG，不改像素 |
| `assets:check` | 导出题库并检查 48 张塔罗 + `tests/registry-v1.json` |
| `assets:upload` | dry-run，只打印将上传的 key |
| `assets:publish` | 只真传并写地址，不重建 |
| `assets:hot` | 覆盖当前玩家指针目录（图+题库），不改指针、不重建 |
| `assets:registry` | 导出题库并传到当前 COS 版本目录，不重建 |
| `assets:registry:probe` | 在题库末尾追加「COS 热更探针」，用于验收热更 |
| `build:weapp` / `dev:weapp` | 自动读取 `.asset-base-url` 注入 `TARO_ASSET_BASE_URL` |

`.asset-base-url` 已 gitignore，只服务本机构建。已手动设置环境变量时，脚本不会覆盖。

发布后用微信开发者工具导入 `D:\Mine\PtKing-miniapp\miniapp`，清缓存后编译。塔罗页应先显示下载百分比，当前皮肤 24 张都成功才进入流程；失败则停在「资源加载失败」，可点「重新加载」。

## 本地不经 COS 预览

模拟器可用本机静态服务代替 COS：

```powershell
npm run art:preview
```

另开终端：

```powershell
$env:TARO_ASSET_DEV_BASE_URL = "http://127.0.0.1:8787/ptking-web/local-dev"
npm run dev:weapp
```

仅开发者工具模拟器走本机；真机仍走正式 `TARO_ASSET_BASE_URL`。预览目录同样是 `art/generated-art`，塔罗路径必须是上面的 `/tarot/...`。

## 不要做的事

- 不要把塔罗图打进 `miniapp` 主包（当前构建约 1.69 MiB，主包红线 2 MiB）。
- 不要把 COS 密钥写进本仓库。
- 不要用占位域名 `placeholder.cos.ap-guangzhou.myqcloud.com` 当真机地址。
