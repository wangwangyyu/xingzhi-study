@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "XINGZHI_HOST=0.0.0.0"
set "PORT=4174"
echo 手机与电脑连接同一 Wi-Fi，打开下方的手机访问地址。
echo 使用期间请保持此窗口打开、电脑处于唤醒状态。
node server.js
pause
