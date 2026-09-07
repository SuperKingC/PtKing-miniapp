# 功能：COS 资产发布与更新

状态：脚本已落地；真实 COS 凭据与首传需你在 kit `.env` 配好后执行一次。

塔罗牌、测试题 JSON、报告配图都不进小程序主包，统一放 COS 版本目录，由 `TARO_ASSET_BASE_URL` 热更下发。塔罗运行时拼 `{根}/tarot/...`，共 24 张。

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

然后把下面五项写进 `D:\Mine\miniapp-kit\.env`（本仓库不放密钥）：

```env
COS_SECRET_ID=...
COS_SECRET_KEY=...
COS_BUCKET=你的桶名-125xxxxxxxx
COS_REGION=ap-guangzhou
COS_PUBLIC_BASE=https://你的访问域名
```

`COS_PUBLIC_BASE` 不要带尾斜杠，不要带 `assets/ptking`。脚本会拼成：

```text
{COS_PUBLIC_BASE}/assets/ptking/{git短SHA}
```

`art.config.json` 的 `output.cos` 保持 `assets/ptking`。塔罗原图已从 Pet10 `public/tarot/` 拷到本地资产目录（gitignore，不入库）。换图覆盖同名文件后执行 `npm run assets:compress`（只 TinyPNG，不降分辨率），再 `npm run assets`。

当前文件：

```text
art/generated-art/tarot/ui/sanctuary-background.jpg
art/generated-art/tarot/ui/card-back.jpg
art/generated-art/tarot/cards/the-fool.jpg
art/generated-art/tarot/cards/the-magician.jpg
art/generated-art/tarot/cards/high-priestess.jpg
art/generated-art/tarot/cards/the-empress.jpg
art/generated-art/tarot/cards/the-emperor.jpg
art/generated-art/tarot/cards/the-hierophant.jpg
art/generated-art/tarot/cards/the-lovers.jpg
art/generated-art/tarot/cards/the-chariot.jpg
art/generated-art/tarot/cards/strength.jpg
art/generated-art/tarot/cards/the-hermit.jpg
art/generated-art/tarot/cards/wheel-of-fortune.jpg
art/generated-art/tarot/cards/justice.jpg
art/generated-art/tarot/cards/the-hanged-man.jpg
art/generated-art/tarot/cards/death.jpg
art/generated-art/tarot/cards/temperance.jpg
art/generated-art/tarot/cards/the-devil.jpg
art/generated-art/tarot/cards/the-tower.jpg
art/generated-art/tarot/cards/the-star.jpg
art/generated-art/tarot/cards/the-moon.jpg
art/generated-art/tarot/cards/the-sun.jpg
art/generated-art/tarot/cards/judgement.jpg
art/generated-art/tarot/cards/the-world.jpg
```

牌面原图像素约 768×1152，背景约 900×1350。界面上牌面大约 190×300 rpx，真机按 2～3 倍屏也就需要约 400×600 像素。因此：

- **只做 TinyPNG、不降分辨率**：像素不变，主要减 JPEG 体积，观感几乎不变。这是当前做法。
- **适度缩小（例如收到 560×840）**：手机上看不出差别，体积会再小一截。
- **收到显示尺寸（190×300）**：会发糊，不要这样做。

换内容覆盖同名即可（上传带 git SHA 新目录，缓存自然失效）。文件名已与代码锁定，不要改名。

## 日常更新（一键）

资源放进 `art/generated-art` 后，任选一种：

- 资源管理器双击仓库根目录的 `一键上传.cmd`
- 或在仓库根执行：`npm run assets`

这一条会：检查 24 张塔罗图 → 真传到 COS → 写入 `.asset-base-url` → 重建 `miniapp/dist`。

只想预演或拆开跑：

```powershell
npm run assets:check
npm run assets:upload
npm run assets:publish
```

| 命令 | 作用 |
|---|---|
| `assets:compress` | 对 `art/generated-art/tarot` 做一次 TinyPNG，不改像素 |
| `assets:check` | 只检查 24 张塔罗是否都在 `art/generated-art` |
| `assets:upload` | dry-run，只打印将上传的 key |
| `assets:publish` | 只真传并写地址，不重建 |
| `build:weapp` / `dev:weapp` | 自动读取 `.asset-base-url` 注入 `TARO_ASSET_BASE_URL` |

`.asset-base-url` 已 gitignore，只服务本机构建。已手动设置环境变量时，脚本不会覆盖。

发布后用微信开发者工具导入 `D:\Mine\PtKing-miniapp\miniapp`，清缓存后编译。塔罗页应先显示下载百分比，24 张都成功才进入流程；失败则停在「资源加载失败」，可点「重新加载」。

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
