@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 校验塔罗资源并上传 COS，随后重建小程序…
echo.
call npm run assets
echo.
if errorlevel 1 (
  echo 失败。请检查：
  echo   1. D:\Mine\miniapp-kit\.env 是否有 COS_SECRET_ID / KEY / BUCKET / REGION / COS_PUBLIC_BASE
  echo   2. art\generated-art\tarot 是否齐 24 张图
) else (
  echo 完成。用微信开发者工具打开 miniapp 目录，清缓存后编译。
)
pause
