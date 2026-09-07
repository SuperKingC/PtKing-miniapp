# 功能：COS 资产发布与更新

状态：脚本已落地；真实 COS 凭据与首传需你在 kit `.env` 配好后执行一次。

塔罗牌、测试题 JSON、报告配图都不进小程序主包，统一放 COS 版本目录，由 `TARO_ASSET_BASE_URL` 热更下发。塔罗运行时拼 `{根}/tarot/...`，共 24 张。

## 一次性准备

1. 开通腾讯云 COS 存储桶（建议公有读 / 或配 CDN），记下桶名、地域、访问域名。
2. 在 `D:\Mine\miniapp-kit\.env` 写入（本仓库不放密钥）：

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

3. 本项目根已有 `art.config.json`（gitignore）。`output.cos` 保持 `assets/ptking`（或 `assets/{project}`）。
4. 微信公众平台 → 开发管理 → 开发设置 → 服务器域名：
   - **downloadFile 合法域名**加入 `COS_PUBLIC_BASE` 的主机名（只填域名，如 `xxx.cos.ap-guangzhou.myqcloud.com`）。
   - 必须 HTTPS。未配置时真机下载失败，塔罗页停在「资源加载失败」。
5. 把 24 张塔罗图放到本地资产目录（不入库）：

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

单图建议 JPEG、先降分辨率再压质量，尽量 ≤180KB。换图升文件名；塔罗这批文件名已与代码锁定，换内容覆盖同名即可（因上传带 git SHA 新目录，缓存自然失效）。

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
| `assets` | 一键校验、上传并重建 |
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
