// X-Ray Analysis Module

class XRayModule {
    constructor(app) {
        this.app = app;
        this.currentImage = null;
        this.currentImageData = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadExampleXRays();
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('xrayUploadArea');
        const input = document.getElementById('xrayInput');
        const uploadBtn = document.getElementById('xrayUploadBtn');
        const analyzeBtn = document.getElementById('analyzeXray');
        const removeBtn = document.getElementById('removeXray');

        // Click to upload - stop propagation to prevent conflicts
        if (uploadBtn) {
            uploadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (input) input.click();
            });
        }

        if (uploadArea) {
            uploadArea.addEventListener('click', (e) => {
                e.stopPropagation();
                if (input) input.click();
            });
        }

        // File input change
        input?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) this.handleImageUpload(file);
        });

        // Drag and drop
        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary-500)';
        });

        uploadArea?.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--border-color)';
        });

        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--border-color)';

            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith('image/')) {
                this.handleImageUpload(file);
            }
        });

        // Analyze button
        analyzeBtn?.addEventListener('click', () => this.analyzeXRay());

        // Remove image button
        removeBtn?.addEventListener('click', () => this.removeImage());
    }

    handleImageUpload(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.app.showNotification('Lütfen geçerli bir görüntü dosyası seçin', 'error');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.app.showNotification('Dosya boyutu 10MB\'dan küçük olmalıdır', 'error');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.currentImageData = e.target.result;
                this.displayImage(e.target.result);
                document.getElementById('analyzeXray')?.removeAttribute('disabled');
            };
            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    }

    displayImage(dataURL) {
        const uploadArea = document.getElementById('xrayUploadArea');
        const preview = document.getElementById('xrayPreview');
        const img = document.getElementById('xrayImage');

        if (uploadArea) uploadArea.classList.add('hidden');
        if (preview) preview.classList.remove('hidden');
        if (img) img.src = dataURL;
    }

    removeImage() {
        const uploadArea = document.getElementById('xrayUploadArea');
        const preview = document.getElementById('xrayPreview');
        const input = document.getElementById('xrayInput');
        const results = document.getElementById('xrayResults');

        if (uploadArea) uploadArea.classList.remove('hidden');
        if (preview) preview.classList.add('hidden');
        if (input) input.value = '';
        if (results) results.classList.add('hidden');

        this.currentImage = null;
        this.currentImageData = null;
        document.getElementById('analyzeXray')?.setAttribute('disabled', 'true');
    }

    async analyzeXRay() {
        if (!this.currentImageData) {
            this.app.showNotification('Lütfen önce bir görüntü yükleyin', 'warning');
            return;
        }

        const analysisType = document.getElementById('analysisType')?.value || 'general';
        const customQuestion = document.getElementById('xrayQuestion')?.value.trim() || null;

        // Get optional patient context - only if checkbox is checked
        let patientAge = null;
        let patientGender = null;
        let patientHistory = null;

        if (window.isPatientContextEnabled && window.isPatientContextEnabled()) {
            patientAge = document.getElementById('patientAge')?.value || null;
            patientGender = document.getElementById('patientGender')?.value || null;
            patientHistory = document.getElementById('patientHistory')?.value?.trim() || null;
        }

        // Show results section immediately with "typing" indicator
        const resultsSection = document.getElementById('xrayResults');
        const resultContent = document.getElementById('xrayResultContent');
        if (resultsSection && resultContent) {
            resultsSection.classList.remove('hidden');
            resultContent.innerHTML = '<span class="typing-indicator">Yanıt yazılıyor...</span>';
        }

        let fullResponse = "";
        const startTime = Date.now();

        try {
            const response = await fetch(`${this.app.API_BASE}/analyze-xray`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_base64: this.currentImageData,
                    analysis_type: analysisType,
                    question: customQuestion,
                    language: this.app.currentLanguage,
                    patient_age: patientAge ? parseInt(patientAge) : null,
                    patient_gender: patientGender || null,
                    patient_history: patientHistory || null
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                fullResponse += text;
                resultContent.innerHTML = this.app.formatMarkdown(fullResponse);
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // Add elapsed time
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            resultContent.innerHTML += `<div class="response-time"><small style="opacity: 0.6;">⏱️ ${elapsed} saniye</small></div>`;

            this.app.showNotification('Analiz tamamlandı!', 'success');
            this.app.modelLoaded = true;

        } catch (error) {
            console.error('X-ray analysis error:', error);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            resultContent.innerHTML = `<span style="color:red">Analiz sırasında hata oluştu. (${elapsed}s)</span>`;
            this.app.showNotification('Analiz sırasında hata oluştu', 'error');
        }
    }

    displayResults(analysis) {
        const resultsSection = document.getElementById('xrayResults');
        const resultContent = document.getElementById('xrayResultContent');

        if (!resultsSection || !resultContent) return;

        resultContent.innerHTML = this.app.formatMarkdown(analysis);
        resultsSection.classList.remove('hidden');

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    loadExampleXRays() {
        const container = document.getElementById('exampleXrays');
        if (!container) return;

        const examples = [
            {
                name: '✓ Normal Göğüs Röntgeni',
                file: 'assets/examples/normal_xray.png',
                description: 'Sağlıklı akciğerler'
            },
            {
                name: '⚠️ Pnömoni Örneği',
                file: 'assets/examples/pneumonia_xray.png',
                description: 'Akciğer enfeksiyonu'
            },
            {
                name: '🦠 COVID-19 Pnömonisi',
                file: 'assets/examples/covid_xray.png',
                description: 'Viral pnömoni'
            }
        ];

        container.innerHTML = examples.map(ex =>
            `<button class="tag" style="cursor: pointer;" data-example="${ex.file}" title="${ex.description}">
                ${ex.name}
            </button>`
        ).join('');

        // Add click handlers to load example images
        container.querySelectorAll('[data-example]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const file = btn.getAttribute('data-example');
                try {
                    const response = await fetch(file);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            this.currentImage = img;
                            this.currentImageData = e.target.result;
                            this.displayImage(e.target.result);
                            document.getElementById('analyzeXray')?.removeAttribute('disabled');
                            this.app.showNotification('Örnek görüntü yüklendi!', 'success');
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(blob);
                } catch (error) {
                    console.error('Example image load error:', error);
                    this.app.showNotification('Örnek görüntü yüklenemedi', 'error');
                }
            });
        });
    }
}

// Initialize when app is ready
function initXRayModule() {
    if (window.app) {
        console.log('Initializing X-ray module...');
        window.xrayModule = new XRayModule(window.app);
    } else {
        console.log('Waiting for app...');
        setTimeout(initXRayModule, 50);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initXRayModule);
} else {
    initXRayModule();
}
