@echo off
REM 토스 로컬 프록시 실행 스크립트
REM - 이 .bat 이 있는 폴더(proxy)로 이동 후 서버를 켭니다.
REM - 더블클릭하면 바로 실행됩니다. 창을 닫으면 서버도 종료됩니다.
cd /d "%~dp0"
echo [toss-proxy] 시작 중... (이 창을 닫으면 서버가 꺼집니다)
node server.js
pause
