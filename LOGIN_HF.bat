@echo off
echo ========================================
echo  Hugging Face Giris Yapma Araci
echo ========================================
echo.
echo Med-Gemma modeli "Gated" (izinli) bir modeldir.
echo Indirmek icin Hugging Face Token'inizi girmeniz gerekir.
echo.
echo Token almak icin: https://huggingface.co/settings/tokens
echo.
set /p TOKEN="Lutfen Hugging Face Token'nizi yapistirin: "
echo.
echo Giris yapiliyor...
huggingface-cli login --token %TOKEN% --add-to-git-credential
echo.
echo Islem tamamlandi! Lutfen backend penceresini kapatip tekrar acin.
pause
