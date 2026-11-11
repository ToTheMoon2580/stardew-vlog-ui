@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "星露谷 Vlog UI 本地服务" /min node server.mjs
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8766/overlay.html"
