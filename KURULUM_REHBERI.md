# Med-Gemma Projesi Kurulum ve Paylaşım Paketi

Bu paket, Med-Gemma Tıbbi Asistan uygulamasını kendi bilgisayarınızda çalıştırmanız için gerekli tüm dosyaları içerir.

## Ön Gereksinimler

Kuruluma başlamadan önce bilgisayarınızda şunların yüklü olduğundan emin olun:

1.  **Python 3.9 veya üzeri**: [Python İndir](https://www.python.org/downloads/) (Kurulum sırasında "Add Python to PATH" seçeneğini işaretlemeyi unutmayın!)
2.  **NVIDIA Ekran Kartı Sürücüleri**: Güncel sürücülerin yüklü olması gereklidir.
3.  **Hugging Face Hesabı**: Modeli indirebilmek için [Hugging Face](https://huggingface.co/) hesabı ve erişim tokenı gereklidir.

## Kurulum Adımları

### 1. Dosyaları Çıkartın
İndirdiğiniz ZIP dosyasını klasöre çıkartın (Örneğin: `C:\Med-Gemma`).

### 2. Otomatik Kurulum ve Başlatma (Önerilen)

Klasör içindeki `START_APP.bat` dosyasına **çift tıklayın**. Bu dosya:
1.  Gerekli kütüphaneleri yüklemeye çalışacak.
2.  Backend ve Frontend servislerini başlatacaktır.

Eğer ilk kez çalıştırıyorsanız, modelin (yaklaşık 8-10 GB) indirilmesi zaman alabilir.

### 3. Manuel Kurulum (Eğer otomatik başlatma çalışmazsa)

**Adım A: Kütüphaneleri Yükleyin**
Proje klasöründe bir terminal açın (Shift + Sağ Tık -> PowerShell penceresini buradan aç) ve şu komutu yazın:
```bash
pip install -r requirements.txt
```

**Adım B: Hugging Face Girişi Yapın**
```bash
huggingface-cli login
```
(Tokenınızı yapıştırın ve Enter'a basın)

**Adım C: Uygulamayı Başlatın**
- Backend için: `start_backend.bat` dosyasına çift tıklayın.
- Frontend için: `start_frontend.bat` dosyasına çift tıklayın.

## Kullanım
Her şey hazır olduğunda tarayıcınızdan **http://localhost:8080** adresine giderek uygulamayı kullanmaya başlayabilirsiniz.
