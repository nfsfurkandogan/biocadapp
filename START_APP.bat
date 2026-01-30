@echo off
echo ========================================
echo  Med-Gemma Uygulamasi Baslatiliyor
echo ========================================
echo.
echo UYARI: Bu script iki pencere acacak:
echo   1. Backend Server (Port 8000)
echo   2. Frontend Server (Port 8080)
echo.
echo Her iki pencereyi de acik tutun!
echo.
pause

echo Backend baslatiliyor...
start "Med-Gemma Backend" cmd /k "cd /d %~dp0 && start_backend.bat"

timeout /t 3 /nobreak >nul

echo Frontend baslatiliyor...
start "Med-Gemma Frontend" cmd /k "cd /d %~dp0 && start_frontend.bat"

echo.
echo ========================================
echo Sunucular baslatildi!
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:8080
echo.
echo Tarayicinizda http://localhost:8080 adresini acin
echo ========================================
echo.
timeout /t 5 /nobreak
start http://localhost:8080
