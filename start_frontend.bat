@echo off
echo ========================================
echo  Med-Gemma Frontend Sunucusu Baslatiliyor
echo ========================================
echo.
echo Frontend baslatiliyor...
echo URL: http://localhost:8080
echo.
echo Tarayicinizda http://localhost:8080 adresini acin
echo.
cd frontend
python -m http.server 8080
