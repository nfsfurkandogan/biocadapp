// Symptom Analysis Module

class SymptomModule {
    constructor(app) {
        this.app = app;
        this.symptoms = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const addBtn = document.getElementById('addSymptom');
        const input = document.getElementById('symptomInput');
        const analyzeBtn = document.getElementById('analyzeSymptoms');

        addBtn?.addEventListener('click', () => this.addSymptom());

        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addSymptom();
            }
        });

        analyzeBtn?.addEventListener('click', () => this.analyzeSymptoms());

        // Common symptom tags
        document.querySelectorAll('.symptom-tags .tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const symptom = tag.getAttribute('data-symptom');
                this.addSymptomToList(symptom);
            });
        });
    }

    addSymptom() {
        const input = document.getElementById('symptomInput');
        const symptom = input?.value.trim();

        if (!symptom) return;

        this.addSymptomToList(symptom);
        input.value = '';
        input.focus();
    }

    addSymptomToList(symptom) {
        if (this.symptoms.includes(symptom)) {
            this.app.showNotification('Bu semptom zaten eklendi', 'warning');
            return;
        }

        if (this.symptoms.length >= 20) {
            this.app.showNotification('En fazla 20 semptom ekleyebilirsiniz', 'warning');
            return;
        }

        this.symptoms.push(symptom);
        this.renderSymptomsList();
        this.updateAnalyzeButton();
    }

    removeSymptom(symptom) {
        this.symptoms = this.symptoms.filter(s => s !== symptom);
        this.renderSymptomsList();
        this.updateAnalyzeButton();
    }

    renderSymptomsList() {
        const container = document.getElementById('symptomsList');
        if (!container) return;

        if (this.symptoms.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Henüz semptom eklenmedi</p>';
            return;
        }

        container.innerHTML = this.symptoms.map(symptom => `
            <div class="symptom-item" style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--spacing-sm) var(--spacing-md);
                background: var(--bg-secondary);
                border-radius: var(--radius-md);
                margin-bottom: var(--spacing-sm);
            ">
                <span>${this.app.escapeHtml(symptom)}</span>
                <button class="remove-symptom" data-symptom="${this.app.escapeHtml(symptom)}" style="
                    background: transparent;
                    border: none;
                    color: var(--error);
                    cursor: pointer;
                    font-size: 1.2rem;
                    padding: var(--spacing-xs);
                ">Kaldır</button>
            </div>
        `).join('');

        // Add remove handlers
        container.querySelectorAll('.remove-symptom').forEach(btn => {
            btn.addEventListener('click', () => {
                const symptom = btn.getAttribute('data-symptom');
                this.removeSymptom(symptom);
            });
        });
    }

    updateAnalyzeButton() {
        const btn = document.getElementById('analyzeSymptoms');
        if (!btn) return;

        if (this.symptoms.length > 0) {
            btn.removeAttribute('disabled');
        } else {
            btn.setAttribute('disabled', 'true');
        }
    }

    async analyzeSymptoms() {
        if (this.symptoms.length === 0) {
            this.app.showNotification('Lütfen en az bir semptom ekleyin', 'warning');
            return;
        }

        const age = document.getElementById('patientAge')?.value;
        const gender = document.getElementById('patientGender')?.value;

        this.app.showLoading('Semptomlar analiz ediliyor...');

        try {
            const requestBody = {
                symptoms: this.symptoms,
                language: this.app.currentLanguage
            };

            if (age) requestBody.age = parseInt(age);
            if (gender) requestBody.gender = gender;

            const response = await this.app.apiRequest('/symptom-check', 'POST', requestBody);

            this.app.hideLoading();

            if (response.success) {
                this.displayResults(response.analysis);
                this.app.showNotification('Analiz tamamlandı!', 'success');
            } else {
                throw new Error(response.error || 'Analysis failed');
            }
        } catch (error) {
            this.app.hideLoading();
            console.error('Symptom analysis error:', error);
            this.app.showNotification('Analiz başarısız oldu. Lütfen tekrar deneyin.', 'error');
        }
    }

    displayResults(analysis) {
        const resultsSection = document.getElementById('symptomResults');
        const resultContent = document.getElementById('symptomResultContent');

        if (!resultsSection || !resultContent) return;

        resultContent.innerHTML = `
            <div style="margin-bottom: var(--spacing-md);">
                <h4 style="color: var(--primary-500); margin-bottom: var(--spacing-sm);">
                    Girilen Semptomlar
                </h4>
                <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-sm); margin-bottom: var(--spacing-lg);">
                    ${this.symptoms.map(s =>
            `<span style="
                            padding: var(--spacing-xs) var(--spacing-sm);
                            background: var(--primary-500);
                            color: white;
                            border-radius: var(--radius-sm);
                            font-size: 0.85rem;
                        ">${this.app.escapeHtml(s)}</span>`
        ).join('')}
                </div>
            </div>
            <div style="line-height: 1.8;">
                ${this.app.formatMarkdown(analysis)}
            </div>
            <div style="
                margin-top: var(--spacing-lg);
                padding: var(--spacing-md);
                background: rgba(255, 193, 7, 0.1);
                border-left: 4px solid var(--warning);
                border-radius: var(--radius-md);
            ">
                <strong>Önemli Uyarı:</strong> Bu analiz sadece bilgilendirme amaçlıdır. 
                Kesin tanı ve tedavi için mutlaka bir sağlık uzmanına başvurun.
            </div>
        `;

        resultsSection.classList.remove('hidden');

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    clearSymptoms() {
        this.symptoms = [];
        this.renderSymptomsList();
        this.updateAnalyzeButton();

        const results = document.getElementById('symptomResults');
        if (results) results.classList.add('hidden');
    }
}

// Initialize when app is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.app) {
            window.symptomModule = new SymptomModule(window.app);
        }
    }, 100);
});
