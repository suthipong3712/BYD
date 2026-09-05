@echo off
cd /d %~dp0
call myenv\Scripts\activate.bat
echo ============================================
echo   BYD Garage System - Online

echo ============================================
uvicorn main:app --host 0.0.0.0 --port 8000
pause