# Med-Gemma Hızlı Başlatma Rehberi

## 🚀 Hızlı Başlatma

### Otomatik Başlatma (Önerilen)
```bash
d:\MEd-GemmaHF\START_APP.bat
```

### Manuel Başlatma

**Terminal 1 - Backend:**
```bash
cd d:\MEd-GemmaHF\backend
d:\MEd-GemmaHF\.venv\Scripts\activate
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd d:\MEd-GemmaHF\frontend
python -m http.server 8080
```

**Tarayıcı:**
http://localhost:8080

## ✅ Durum Kontrolü

| Bileşen | URL | Durum |
|---------|-----|-------|
| Backend | http://localhost:8000 | Health check: `/api/health` |
| Frontend | http://localhost:8080 | Ana uygulama |

## 🎯 Kullanılabilir Modüller

| Modül | Açıklama |
|-------|----------|
| 💬 Tıbbi Sohbet | AI destekli soru-cevap |
| 🩻 Röntgen | Göğüs röntgeni analizi |
| 🔬 CT/MR | Beyin, toraks, karın görüntüleme |
| 👁️ Fundus | Retina ve göz analizi |
| 🔍 Dermatoloji | Cilt lezyon analizi |
| 🧬 Histopatoloji | Patoloji değerlendirmesi |
| 🧪 Lab Sonuçları | Kan/idrar tahlili okuma |
| 🔄 Karşılaştırma | Önceki/sonraki görüntü |
| 💊 İlaç Bilgisi | İlaç araştırması |
| 🩺 Semptom | Triaj ve değerlendirme |

## 👤 Hasta Bilgileri (Opsiyonel)

- **"Hasta Bilgilerini Analize Dahil Et"** checkbox'ı
- Varsayılan: Kapalı (sadece görüntü analizi)
- Açıldığında: Yaş, cinsiyet, klinik öykü girilebilir
- Tüm görüntüleme modüllerinde çalışır

## ⚠️ Laptop Kullanıcıları

GPU sıcaklığını izleyin:
```bash
nvidia-smi -l 1
```

85°C+ görürseniz:
- Laptop soğutma padı kullanın
- `model_handler.py`'de `max_memory` değerini azaltın

## 🔧 Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| Port kullanımda | `netstat -ano \| findstr :8000` |
| CUDA hatası | GPU sürücülerini güncelleyin |
| Module hatası | `pip install -r requirements.txt` |
| Yanıt kesik | `max_new_tokens` artırın (1024) |

---

**🎉 http://localhost:8080 adresini açın!**
