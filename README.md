# Med-Gemma 4B IT - Tıbbi Asistan Uygulaması

🩺 **Med-Gemma 4B IT** modelini kullanan gelişmiş, yapay zeka destekli tıbbi asistan web uygulaması

![Med-Gemma Logo](https://img.shields.io/badge/Med--Gemma-4B--IT-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.9+-green?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-teal?style=for-the-badge)
![License](https://img.shields.io/badge/License-Educational-orange?style=for-the-badge)

## ⚠️ Önemli Uyarı

> **Bu uygulama eğitim ve araştırma amaçlıdır.**
> - Klinik kullanım için FDA/CE onayı gerekmektedir
> - Üretilen sonuçlar profesyonel tıbbi görüş yerine geçmez
> - Acil durumlarda 112'yi arayın
> - İlaç kullanımı ve tedavi kararları için doktorunuza danışın

## 🎯 Özellikler

### 💬 Tıbbi Sohbet Asistanı
- Gerçek zamanlı soru-cevap
- Konuşma geçmişi
- Çok dilli destek (TR/EN)
- Örnek sorular

### 🩻 Göğüs Röntgeni Analizi
- Röntgen görüntüsü yükleme (drag & drop)
- Otomatik görüntü analizi
- Pnömoni, fraktür, kardiyak değerlendirme
- Streaming yanıt desteği

### 🔬 CT/MR Görüntü Analizi
- Beyin MR, Toraks CT, Karın CT, Omurga MR
- Detaylı radyolojik değerlendirme

### 👁️ Fundus/Göz Analizi
- Diyabetik retinopati taraması
- Glokom değerlendirmesi
- Makula dejenerasyonu analizi

### 🔍 Dermatoloji/Cilt Analizi
- Melanom taraması
- Benign/Malign değerlendirme
- Dermoskopi analizi

### 🧬 Histopatoloji Analizi
- Kanser hücresi tespiti
- Tümör derecesi değerlendirmesi
- Cerrahi sınır analizi

### 🧪 Lab Sonucu Okuma
- Tam kan sayımı (Hemogram)
- Biyokimya değerlendirmesi
- Tiroid testleri, Lipid profili, İdrar tahlili

### 🔄 Görüntü Karşılaştırma
- Önceki/Sonraki görüntü karşılaştırması
- Hastalık progresyonu takibi
- Tedavi yanıtı değerlendirmesi

### 💊 İlaç Bilgi Sistemi
- İlaç arama ve bilgilendirme
- Yan etki bilgileri
- İlaç etkileşim kontrolü
- Dozaj önerileri

### 🩺 Semptom Analizi
- Çoklu semptom girişi
- Triaj değerlendirmesi
- Olası tanılar
- Aciliyet seviyesi

### � Opsiyonel Hasta Bilgileri
- **Checkbox ile kontrol:** Varsayılan olarak kapalı
- Yaş, cinsiyet, klinik öykü girişi
- İşaretlendiğinde tüm analizlere dahil edilir

## 🚀 Kurulum

### Gereksinimler

- Python 3.9 veya üzeri
- NVIDIA GPU (8GB+) - **CUDA desteği**
- 20GB+ boş disk alanı (model için)

### Adım 1: Python Bağımlılıklarını Yükleyin

```bash
cd d:\MEd-GemmaHF
pip install -r requirements.txt
```

### Adım 2: Hugging Face Login (İlk kez)

```bash
huggingface-cli login
```

> Med-Gemma modeli için Hugging Face erişim izni gereklidir.

### Adım 3: Backend'i Başlatın

```bash
cd d:\MEd-GemmaHF\backend
python app.py
```

> **İlk çalıştırma:** Model Hugging Face'den indirilecektir (~8-10 GB). Bu işlem internet hızınıza bağlı olarak 10-30 dakika sürebilir.

### Adım 4: Frontend'i Başlatın

Yeni bir terminal penceresi açın:

```bash
cd d:\MEd-GemmaHF\frontend
python -m http.server 8080
```

### Adım 5: Uygulamayı Açın

Tarayıcınızda şu adresi açın: **http://localhost:8080**

## 📁 Proje Yapısı

```
MEd-GemmaHF/
├── backend/
│   ├── app.py              # FastAPI ana uygulama
│   ├── model_handler.py    # Med-Gemma model yönetimi
│   ├── utils.py            # Yardımcı fonksiyonlar
│   └── api_routes.py       # API endpoint'leri
├── frontend/
│   ├── index.html          # Ana sayfa
│   ├── css/
│   │   └── style.css       # Premium tasarım sistemi
│   ├── js/
│   │   ├── app.js          # Ana uygulama kontrolcüsü
│   │   ├── chat.js         # Sohbet modülü
│   │   ├── xray.js         # Röntgen analiz modülü
│   │   ├── drug.js         # İlaç bilgi modülü
│   │   ├── symptom.js      # Semptom analiz modülü
│   │   └── imaging.js      # Tüm görüntüleme modülleri
│   └── assets/
│       ├── images/         # Görseller
│       └── examples/       # Örnek görüntüler
├── requirements.txt        # Python bağımlılıkları
├── config.json            # Uygulama konfigürasyonu
├── START_APP.bat          # Otomatik başlatma scripti
└── README.md              # Bu dosya
```

## 🎨 Tasarım Özellikleri

- ✨ **Modern UI/UX:** Glassmorphism ve gradient efektler
- 🌓 **Dark Mode:** Göz yormayan karanlık tema
- 📱 **Responsive:** Mobil, tablet ve desktop uyumlu
- 🎭 **Animasyonlar:** Smooth geçişler ve micro-interactions
- 🎨 **Medikal Renk Paleti:** Profesyonel tıbbi tema

## 🔧 API Endpoints

### Chat
```
POST /api/chat
Body: {
  "message": "string",
  "conversation_history": [],
  "language": "tr"
}
```

### X-Ray Analysis
```
POST /api/analyze-xray
Body: {
  "image_base64": "string",
  "analysis_type": "general|pneumonia|fracture|cardiac|lung",
  "patient_age": 45,           // Opsiyonel
  "patient_gender": "Erkek",   // Opsiyonel
  "patient_history": "...",    // Opsiyonel
  "language": "tr"
}
```

### Medical Image Analysis (CT/MR, Fundus, Dermo, Histo, Lab)
```
POST /api/analyze-medical-image
Body: {
  "image_base64": "string",
  "image_type": "ctmr|fundus|dermo|histo|lab",
  "analysis_type": "string",
  "question": "optional question",
  "language": "tr"
}
```

### Drug Information
```
POST /api/drug-info
Body: {
  "drug_name": "string",
  "query_type": "general|interactions|side_effects|dosage",
  "language": "tr"
}
```

### Symptom Analysis
```
POST /api/symptom-check
Body: {
  "symptoms": ["string"],
  "age": 0,
  "gender": "male|female|other",
  "language": "tr"
}
```

## 💻 GPU Bellek Kullanımı ve Optimizasyon

Model **4-bit NF4 quantization** ile optimize edilmiştir:

| Ayar | Değer | Açıklama |
|------|-------|----------|
| Compute dtype | bfloat16 | Daha hızlı hesaplama |
| Quantization | NF4 + Double | Yüksek kalite |
| Max Memory | 4.5GB | Laptop dostu |
| Low CPU Memory | Aktif | RAM tasarrufu |

### Laptop Kullanıcıları İçin
- GPU kullanımı 4.5GB ile sınırlandırılmıştır
- Termal sorunları önlemek için optimize edilmiştir
- `nvidia-smi -l 1` ile sıcaklığı izleyebilirsiniz

### Masaüstü Kullanıcıları İçin
`model_handler.py` dosyasında `max_memory` değerini artırabilirsiniz:
```python
model_kwargs["max_memory"] = {0: "6GB"}  # veya "7GB"
```

## 🧪 Test Etme

### Backend Testi
```bash
# Health check
curl http://localhost:8000/api/health

# Example questions
curl http://localhost:8000/api/example-questions?language=tr
```

### Örnek Kullanım Senaryoları

1. **Sohbet Testi:**
   - "Pnömoni belirtileri nelerdir?"
   - "Aspirin ne için kullanılır?"

2. **Röntgen Analizi:**
   - Örnek röntgen görüntülerinden birini yükleyin
   - Analiz tipini seçin
   - "Analiz Et" butonuna tıklayın

3. **İlaç Bilgisi:**
   - İlaç adı: "Paracetamol"
   - Bilgi türü: "Yan Etkiler"

4. **Semptom Analizi:**
   - Semptomlar: Ateş, Öksürük, Nefes darlığı
   - Yaş: 35
   - Cinsiyet: Erkek

## 🛠️ Sorun Giderme

### Model yüklenmiyor
- GPU belleğinin yeterli olduğundan emin olun
- CUDA sürücülerinin güncel olduğunu kontrol edin
- `torch.cuda.is_available()` True döndürmeli

### Bilgisayar kapanıyor (Laptop)
- GPU sıcaklığını kontrol edin: `nvidia-smi -l 1`
- `max_memory` değerini azaltın (4GB veya daha az)
- Laptop soğutma padı kullanın

### Backend'e bağlanılamıyor
- Backend'in çalıştığından emin olun (port 8000)
- Firewall ayarlarını kontrol edin
- CORS hatası için config.json'u kontrol edin

### Görüntü yüklenemiyor
- Dosya boyutu 10MB'dan küçük olmalı
- Desteklenen formatlar: JPG, PNG
- Görüntü boyutu 100x100 ile 4096x4096 arasında olmalı

### Yanıtlar yarım kalıyor
- `max_new_tokens` değerini artırın (app.py'de 1024'e ayarlandı)

## 📚 Kullanılan Teknolojiler

**Backend:**
- FastAPI - Modern Python web framework
- PyTorch - Deep learning framework
- Transformers - Hugging Face model library
- BitsAndBytes - GPU quantization

**Frontend:**
- Vanilla JavaScript (ES6+)
- Modern CSS (Glassmorphism)
- HTML5
- Fetch API

**Model:**
- Med-Gemma 4B IT (google/medgemma-4b-it)
- 4-bit NF4 Quantization + Double Quant
- SigLIP Vision Encoder

## 🤝 Katkıda Bulunma

Bu proje eğitim amaçlıdır. Önerileriniz için issue açabilirsiniz.

## 📄 Lisans

Bu proje eğitim ve araştırma amaçlıdır. Ticari kullanım için Google'ın Med-Gemma lisans şartlarını kontrol edin.

## 🙏 Teşekkürler

- Google DeepMind - Med-Gemma modeli için
- Hugging Face - Model hosting için
- FastAPI team - Harika framework için

## 📞 İletişim

Sorularınız için GitHub issues kullanın.

---

**Not:** Bu uygulama tıbbi cihaz değildir ve klinik karar verme sürecinde kullanılmamalıdır.
