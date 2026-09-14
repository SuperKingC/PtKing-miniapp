# 内容工作记录

- 2026-09-14 15:29：修好 `export-registry.mjs`（能加载 TS 注册表）；导出进 `art/generated-art/tests/registry-v1.json`。`assets:registry` 传到当前 COS 指针；`assets:registry:probe` 追加「COS 热更探针」。全量/热更图上传时 JSON 带 `assetRev`。
- 2026-09-08 09:20：补齐 MBTI 外向/内向、直觉/实感各 1 题，使四维各 11 题共 44 题；介绍文案改为约 7 分钟。新增构建外导出脚本 `content/export-registry.mjs`，将当前注册表写成 `art/generated-art/tests/registry-v1.json`，不进主包、不发布 COS。

- 2026-09-07 19:34：扩充 `src/domain/tests/mbtiTest.ts` 至 44 题，四维各 11 题；同步耗时与介绍文案，保留趣味声明，未改变静态离线兜底结构。
- 2026-09-07 19:34：在 `src/domain/tests/mbtiTest.test.ts` 增加题数、维度均衡、题干去重契约。
