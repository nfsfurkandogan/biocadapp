// Imaging Module - Unified handler for all medical imaging types
// Handles CT/MR, Fundus, Dermoscopy, Histopathology, Lab Results, and Image Comparison

class ImagingModule {
    constructor(app) {
        this.app = app;
        this.images = {
            ctmr: null,
            fundus: null,
            dermo: null,
            histo: null,
            lab: null,
            compareBefore: null,
            compareAfter: null
        };
        this.dicomFiles = {
            ctmr: null
        };
        this.init();
    }

    init() {
        this.setupUploadHandlers();
        this.setupAnalyzeButtons();
    }

    setupUploadHandlers() {
        const modules = ['ctmr', 'fundus', 'dermo', 'histo', 'lab'];

        modules.forEach(mod => {
            const uploadArea = document.getElementById(`${mod}UploadArea`);
            const input = document.getElementById(`${mod}Input`);

            if (uploadArea && input) {
                uploadArea.addEventListener('click', () => input.click());
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('dragover');
                });
                uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('dragover');
                    if (e.dataTransfer.files.length > 0) {
                        this.handleFile(e.dataTransfer.files[0], mod);
                    }
                });
                input.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        this.handleFile(e.target.files[0], mod);
                    }
                });
            }
        });

        // Compare module special handling (two images)
        ['Before', 'After'].forEach(side => {
            const uploadArea = document.getElementById(`compare${side}Area`);
            const input = document.getElementById(`compare${side}Input`);

            if (uploadArea && input) {
                uploadArea.addEventListener('click', () => input.click());
                input.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        this.handleCompareFile(e.target.files[0], side.toLowerCase());
                    }
                });
            }
        });
    }

    handleFile(file, moduleId) {
        const isDicom = this.isDicomFile(file);

        if (moduleId === 'ctmr' && isDicom) {
            this.images[moduleId] = null;
            this.dicomFiles[moduleId] = file;
            this.showDicomPreview(moduleId, file);
            document.getElementById(`analyze${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}`)?.removeAttribute('disabled');
            return;
        }
        if (isDicom) {
            this.app.showNotification('DICOM dosyaları yalnızca CT/MR modülünde desteklenir', 'warning');
            return;
        }

        // Check if file is PDF - not directly supported
        if (file.type === 'application/pdf') {
            this.app.showNotification('PDF dosyaları desteklenmiyor. Lütfen lab sonucunuzun ekran görüntüsünü (PNG/JPG) yükleyin.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.images[moduleId] = e.target.result;
            if (this.dicomFiles[moduleId]) {
                this.dicomFiles[moduleId] = null;
            }
            this.displayImage(moduleId, e.target.result);
            document.getElementById(`analyze${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}`)?.removeAttribute('disabled');
        };
        reader.readAsDataURL(file);
    }

    handleCompareFile(file, side) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.images[`compare${side.charAt(0).toUpperCase() + side.slice(1)}`] = e.target.result;

            const preview = document.getElementById(`compare${side.charAt(0).toUpperCase() + side.slice(1)}Preview`);
            const img = document.getElementById(`compare${side.charAt(0).toUpperCase() + side.slice(1)}Image`);
            const uploadArea = document.getElementById(`compare${side.charAt(0).toUpperCase() + side.slice(1)}Area`);

            if (img) img.src = e.target.result;
            if (preview) preview.classList.remove('hidden');
            if (uploadArea) uploadArea.classList.add('hidden');

            // Enable compare button if both images are loaded
            if (this.images.compareBefore && this.images.compareAfter) {
                document.getElementById('analyzeCompare')?.removeAttribute('disabled');
            }
        };
        reader.readAsDataURL(file);
    }

    displayImage(moduleId, dataURL) {
        const uploadArea = document.getElementById(`${moduleId}UploadArea`);
        const preview = document.getElementById(`${moduleId}Preview`);
        const img = document.getElementById(`${moduleId}Image`);
        const dicomLabel = preview?.querySelector('.dicom-placeholder');

        if (uploadArea) uploadArea.classList.add('hidden');
        if (preview) preview.classList.remove('hidden');
        if (img) {
            img.style.display = 'block';
            img.src = dataURL;
        }
        if (dicomLabel) dicomLabel.remove();
    }

    removeImage(moduleId) {
        this.images[moduleId] = null;
        if (this.dicomFiles[moduleId]) {
            this.dicomFiles[moduleId] = null;
        }
        const uploadArea = document.getElementById(`${moduleId}UploadArea`);
        const preview = document.getElementById(`${moduleId}Preview`);
        const input = document.getElementById(`${moduleId}Input`);
        const results = document.getElementById(`${moduleId}Results`);
        const analyzeBtn = document.getElementById(`analyze${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}`);
        const dicomLabel = preview?.querySelector('.dicom-placeholder');
        const img = document.getElementById(`${moduleId}Image`);

        if (uploadArea) uploadArea.classList.remove('hidden');
        if (preview) preview.classList.add('hidden');
        if (input) input.value = '';
        if (results) results.classList.add('hidden');
        if (dicomLabel) dicomLabel.remove();
        if (img) img.style.display = 'block';
        if (analyzeBtn) analyzeBtn.setAttribute('disabled', 'true');
    }

    async loadExampleImage(moduleId, imgSrc) {
        try {
            // Fetch the image and convert to base64
            const response = await fetch(imgSrc);
            const blob = await response.blob();

            const reader = new FileReader();
            reader.onload = (e) => {
                const dataURL = e.target.result;
                this.images[moduleId] = dataURL;
                this.displayImage(moduleId, dataURL);

                // Button ID mapping (moduleId -> analyze button ID)
                const buttonIdMap = {
                    'ctmr': 'analyzeCTMR',
                    'fundus': 'analyzeFundus',
                    'dermo': 'analyzeDermo',
                    'histo': 'analyzeHisto',
                    'lab': 'analyzeLab'
                };

                // Enable analyze button
                const buttonId = buttonIdMap[moduleId];
                const analyzeBtn = document.getElementById(buttonId);
                if (analyzeBtn) {
                    analyzeBtn.removeAttribute('disabled');
                    console.log(`Enabled button: ${buttonId}`);
                }

                this.app.showNotification('Örnek görüntü yüklendi! Analiz edebilirsiniz.', 'success');
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('Error loading example image:', error);
            this.app.showNotification('Örnek görüntü yüklenemedi', 'error');
        }
    }

    removeCompareImage(side) {
        const key = `compare${side.charAt(0).toUpperCase() + side.slice(1)}`;
        this.images[key] = null;

        const uploadArea = document.getElementById(`compare${side.charAt(0).toUpperCase() + side.slice(1)}Area`);
        const preview = document.getElementById(`compare${side.charAt(0).toUpperCase() + side.slice(1)}Preview`);
        const input = document.getElementById(`compare${side.charAt(0).toUpperCase() + side.slice(1)}Input`);

        if (uploadArea) uploadArea.classList.remove('hidden');
        if (preview) preview.classList.add('hidden');
        if (input) input.value = '';

        document.getElementById('analyzeCompare')?.setAttribute('disabled', 'true');
    }

    setupAnalyzeButtons() {
        // CT/MR
        document.getElementById('analyzeCTMR')?.addEventListener('click', () => this.analyzeImage('ctmr'));
        // Fundus
        document.getElementById('analyzeFundus')?.addEventListener('click', () => this.analyzeImage('fundus'));
        // Dermoscopy
        document.getElementById('analyzeDermo')?.addEventListener('click', () => this.analyzeImage('dermo'));
        // Histopathology
        document.getElementById('analyzeHisto')?.addEventListener('click', () => this.analyzeImage('histo'));
        // Lab Results
        document.getElementById('analyzeLab')?.addEventListener('click', () => this.analyzeImage('lab'));
        // Compare
        document.getElementById('analyzeCompare')?.addEventListener('click', () => this.analyzeCompare());
    }

    async analyzeImage(moduleId) {
        if (!this.images[moduleId] && !this.dicomFiles[moduleId]) {
            this.app.showNotification('Lütfen önce bir görüntü yükleyin', 'warning');
            return;
        }

        const typeSelect = document.getElementById(`${moduleId}Type`);
        const analysisType = typeSelect?.value || 'general';
        const moduleQuestion = document.getElementById(`${moduleId}Question`)?.value || '';

        // Get shared patient context - only if checkbox is checked
        const patientData = window.getPatientContext ? window.getPatientContext() : null;

        // Build patient context string if enabled and has data
        let patientContext = '';
        if (patientData) {
            if (patientData.age) patientContext += `Hasta yaşı: ${patientData.age}. `;
            if (patientData.gender) patientContext += `Cinsiyet: ${patientData.gender}. `;
            if (patientData.history) patientContext += `Klinik öykü: ${patientData.history}. `;
        }

        // Combine patient context with module-specific question
        let question = '';
        if (patientContext) question += patientContext;
        if (moduleQuestion) question += moduleQuestion;
        question = question.trim() || null;

        // Show results section immediately with "typing" indicator
        const resultsSection = document.getElementById(`${moduleId}Results`);
        const resultContent = document.getElementById(`${moduleId}ResultContent`);
        if (resultsSection && resultContent) {
            resultsSection.classList.remove('hidden');
            resultContent.innerHTML = '<span class="typing-indicator">Yanıt yazılıyor...</span>';
        }

        let fullResponse = "";
        const startTime = Date.now();

        try {
            if (this.dicomFiles[moduleId]) {
                await this.analyzeDicom(moduleId, this.dicomFiles[moduleId], analysisType, question, resultContent, resultsSection, startTime);
                return;
            }

            const response = await fetch(`${this.app.API_BASE}/analyze-medical-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_base64: this.images[moduleId],
                    image_type: moduleId,
                    analysis_type: analysisType,
                    question: question,
                    language: this.app.currentLanguage
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
            }

            // Add elapsed time
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            resultContent.innerHTML += `<div class="response-time"><small style="opacity: 0.6;">⏱️ ${elapsed} saniye</small></div>`;

            this.app.showNotification('Analiz tamamlandı!', 'success');
            this.app.modelLoaded = true;

        } catch (error) {
            console.error('Analysis error:', error);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            resultContent.innerHTML = `<span style="color:red">Analiz sırasında hata oluştu. (${elapsed}s)</span>`;
            this.app.showNotification('Analiz sırasında hata oluştu', 'error');
        }
    }

    async analyzeDicom(moduleId, dicomFile, analysisType, question, resultContent, resultsSection, startTime) {
        const formData = new FormData();
        formData.append('file', dicomFile);
        formData.append('image_type', moduleId);
        formData.append('analysis_type', analysisType);
        if (question) formData.append('question', question);
        formData.append('language', this.app.currentLanguage);

        const response = await fetch(`${this.app.API_BASE}/analyze-dicom`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let fullResponse = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            fullResponse += text;
            resultContent.innerHTML = this.app.formatMarkdown(fullResponse);
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        resultContent.innerHTML += `<div class="response-time"><small style="opacity: 0.6;">⏱️ ${elapsed} saniye</small></div>`;

        this.app.showNotification('DICOM analizi tamamlandı!', 'success');
        this.app.modelLoaded = true;
        resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showDicomPreview(moduleId, file) {
        const uploadArea = document.getElementById(`${moduleId}UploadArea`);
        const preview = document.getElementById(`${moduleId}Preview`);
        const img = document.getElementById(`${moduleId}Image`);

        if (uploadArea) uploadArea.classList.add('hidden');
        if (preview) preview.classList.remove('hidden');
        if (img) img.style.display = 'none';

        if (preview) {
            const existing = preview.querySelector('.dicom-placeholder');
            if (existing) existing.remove();

            const label = document.createElement('div');
            label.className = 'dicom-placeholder';
            label.textContent = `DICOM yüklendi: ${file.name}`;
            preview.appendChild(label);
        }
    }

    isDicomFile(file) {
        const name = (file.name || '').toLowerCase();
        const type = (file.type || '').toLowerCase();
        return name.endsWith('.dcm') || name.endsWith('.dicom') || type === 'application/dicom' || type === 'application/dicom+json';
    }

    async analyzeCompare() {
        if (!this.images.compareBefore || !this.images.compareAfter) {
            this.app.showNotification('Lütfen her iki görüntüyü de yükleyin', 'warning');
            return;
        }

        const compareType = document.getElementById('compareType')?.value || 'progression';

        this.app.showLoading('Görüntüler karşılaştırılıyor...');
        const startTime = Date.now();

        try {
            const response = await this.app.apiRequest('/compare-images', 'POST', {
                before_image: this.images.compareBefore,
                after_image: this.images.compareAfter,
                comparison_type: compareType,
                language: this.app.currentLanguage
            });

            this.app.hideLoading();
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            if (response.success) {
                this.displayResults('compare', response.analysis, elapsed);
                this.app.showNotification('Karşılaştırma tamamlandı!', 'success');
            } else {
                throw new Error(response.error || 'Karşılaştırma başarısız');
            }
        } catch (error) {
            this.app.hideLoading();
            console.error('Comparison error:', error);
            this.app.showNotification('Karşılaştırma sırasında hata oluştu', 'error');
        }
    }

    displayResults(moduleId, analysis, elapsed) {
        const resultsSection = document.getElementById(`${moduleId}Results`);
        const resultContent = document.getElementById(`${moduleId}ResultContent`);

        if (resultsSection && resultContent) {
            resultsSection.classList.remove('hidden');
            resultContent.innerHTML = `
                <div class="analysis-result">
                    ${this.app.formatMarkdown(analysis)}
                </div>
                <div class="response-time">
                    <small style="opacity: 0.6;">⏱️ ${elapsed} saniye</small>
                </div>
            `;
        }
    }
}

// Initialize when app is ready
function initImagingModule() {
    if (window.app) {
        console.log('Initializing imaging module...');
        window.imagingModule = new ImagingModule(window.app);
    } else {
        setTimeout(initImagingModule, 50);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImagingModule);
} else {
    initImagingModule();
}
