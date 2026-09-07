@echo off
cd /d "%~dp0"
echo Checking tarot assets, uploading COS, then rebuilding...
echo.
call npm run assets
echo.
if errorlevel 1 (
  echo FAILED.
  echo 1. Put COS_SECRET_ID COS_SECRET_KEY COS_BUCKET COS_REGION COS_PUBLIC_BASE in D:\Mine\miniapp-kit\.env
  echo 2. Keep 24 images under art\generated-art\tarot
) else (
  echo DONE. Open the miniapp folder in WeChat DevTools, clear cache, then compile.
)
pause
