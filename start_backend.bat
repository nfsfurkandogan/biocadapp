@echo off
echo ========================================
echo  Med-Gemma Backend Sunucusu Baslatiliyor
echo ========================================
echo.
echo GPU kontrolu yapiliyor...
python -c "import torch; print('CUDA Available:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')"
echo.
echo Backend baslatiliyor...
echo API: http://localhost:8000
echo Health Check: http://localhost:8000/api/health
echo.
echo UYARI: Ilk calistirma model indirecek (~8-10 GB)
echo Model yukleniyor... Lutfen bekleyin...
echo.
cd backend
python app.py
