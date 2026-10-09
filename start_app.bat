@echo off
title On Thi Sieu Toc - HCM202 / MLN122 / ITE302c (Port 8888)
cd /d "%~dp0"

echo =======================================================
echo    DANG KHOI CHAY UNG DUNG ON THI SIEU TOC (PORT 8888)
echo =======================================================
echo.
echo Thu muc hien tai: %CD%
echo Dia chi web:      http://localhost:8888/
echo.
echo Dang mo trinh duyet...
start http://localhost:8888/

echo Dang chay local HTTP server tai cong 8888...
echo (Tranh trung port 8080 cua Java Backend va tranh chan Chrome)
echo (Nhan Ctrl+C de dung server khi hoc xong)
echo.

python -m http.server 8888

pause
