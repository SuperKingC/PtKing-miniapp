# 工作记录

- 时间：2026-09-08 15:30
- 原因：直接编 miniapp 时没读仓库根 `.asset-base-url`，真机塔罗落到占位 COS。
- 修改：`index.ts` 增加 `readLocalAssetBaseUrl`，环境变量优先，其次读 `.asset-base-url`。
