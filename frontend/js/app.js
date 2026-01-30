// Med-Gemma Main Application Controller
// Modern JavaScript with ES6+ features

class MedGemmaApp {
    constructor() {
        this.API_BASE = 'http://localhost:8000/api';
        this.currentModule = 'chat';
        this.currentLanguage = 'tr';
        this.theme = localStorage.getItem('theme') || 'light';
        this.conversationHistory = [];
        this.modelLoaded = false;  // Track if model is loaded

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.applyTheme();
        this.loadExampleQuestions();
        await this.checkHealth();
        this.handleDisclaimer();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const module = item.getAttribute('data-module');
                this.switchModule(module);
            });
        });

        // Language switch
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang');
                this.switchLanguage(lang);
            });
        });

        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Disclaimer modal
        document.getElementById('acceptDisclaimer')?.addEventListener('click', () => {
            this.acceptDisclaimer();
        });
    }

    switchModule(moduleName) {
        // Hide all modules
        document.querySelectorAll('.module').forEach(module => {
            module.classList.remove('active');
        });

        // Show selected module
        const targetModule = document.getElementById(`${moduleName}Module`);
        if (targetModule) {
            targetModule.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-module="${moduleName}"]`)?.classList.add('active');

        this.currentModule = moduleName;
    }

    switchLanguage(lang) {
        this.currentLanguage = lang;

        // Update UI
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-lang="${lang}"]`)?.classList.add('active');

        // Update content based on language
        this.updateLanguageContent(lang);
    }

    updateLanguageContent(lang) {
        const translations = {
            tr: {
                chatTitle: '💬 Tıbbi Sohbet Asistanı',
                chatSubtitle: 'Tıbbi sorularınızı sorun, yapay zeka size yardımcı olsun',
                xrayTitle: '🩻 Röntgen Görüntüsü Analizi',
                xraySubtitle: 'Göğüs röntgeni yükleyin ve yapay zeka analizini alın',
                drugTitle: '💊 İlaç Bilgi Sistemi',
                drugSubtitle: 'İlaç bilgileri, yan etkiler ve etkileşimler hakkında bilgi alın',
                symptomTitle: '🔍 Semptom Analizi ve Triaj',
                symptomSubtitle: 'Semptomlarınızı girin ve yapay zeka değerlendirmesi alın'
            },
            en: {
                chatTitle: '💬 Medical Chat Assistant',
                chatSubtitle: 'Ask medical questions and get AI-powered assistance',
                xrayTitle: '🩻 X-Ray Image Analysis',
                xraySubtitle: 'Upload chest X-rays and get AI analysis',
                drugTitle: '💊 Drug Information System',
                drugSubtitle: 'Get drug information, side effects, and interactions',
                symptomTitle: '🔍 Symptom Analysis & Triage',
                symptomSubtitle: 'Enter your symptoms and get AI assessment'
            }
        };

        const content = translations[lang];

        // Update module headers
        const modules = ['chat', 'xray', 'drug', 'symptom'];
        modules.forEach(module => {
            const headerTitle = document.querySelector(`#${module}Module .module-header h2`);
            const headerSubtitle = document.querySelector(`#${module}Module .module-header p`);

            if (headerTitle) headerTitle.textContent = content[`${module}Title`];
            if (headerSubtitle) headerSubtitle.textContent = content[`${module}Subtitle`];
        });
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('theme', this.theme);
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.theme === 'light' ? '🌙' : '☀️';
        }
    }

    handleDisclaimer() {
        const disclaimerAccepted = localStorage.getItem('disclaimerAccepted');
        if (disclaimerAccepted) {
            this.acceptDisclaimer();
        }
    }

    acceptDisclaimer() {
        const modal = document.getElementById('disclaimerModal');
        if (modal) {
            modal.classList.remove('active');
            localStorage.setItem('disclaimerAccepted', 'true');
        }
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.API_BASE}/health`);
            const data = await response.json();

            this.updateGPUStatus(data);

            if (!data.model_loaded) {
                this.showNotification('Model will be loaded on first request', 'warning');
            }
        } catch (error) {
            console.error('Health check failed:', error);
            this.showNotification('Backend connection failed. Please start the server.', 'error');
        }
    }

    updateGPUStatus(healthData) {
        const statusElement = document.getElementById('gpuStatus');
        if (!statusElement) return;

        const statusText = statusElement.querySelector('.status-text');
        const statusDot = statusElement.querySelector('.status-dot');

        if (healthData.cuda_available) {
            statusText.textContent = `GPU: ${healthData.gpu_memory_allocated || 'Ready'}`;
            statusDot.style.background = 'var(--success)';
        } else {
            statusText.textContent = 'GPU: Not Available';
            statusDot.style.background = 'var(--error)';
        }
    }

    async loadExampleQuestions() {
        try {
            const response = await fetch(`${this.API_BASE}/example-questions?language=${this.currentLanguage}`);
            const data = await response.json();

            if (data.success && data.questions) {
                this.displayExampleQuestions(data.questions);
            }
        } catch (error) {
            console.error('Failed to load example questions:', error);
        }
    }

    displayExampleQuestions(questions) {
        const container = document.getElementById('exampleQuestions');
        if (!container) return;

        container.innerHTML = questions.slice(0, 5).map(question =>
            `<div class="example-question" data-question="${this.escapeHtml(question)}">
                ${this.escapeHtml(question)}
            </div>`
        ).join('');

        // Add click handlers
        container.querySelectorAll('.example-question').forEach(el => {
            el.addEventListener('click', () => {
                const question = el.getAttribute('data-question');
                const input = document.getElementById('chatInput');
                if (input) {
                    input.value = question;
                    input.focus();
                }
            });
        });
    }

    showLoading(message = 'Analiz ediliyor...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            const text = overlay.querySelector('.loading-text');
            if (text) {
                // Check if this is likely the first request (model downloading)
                if (message === 'Analiz ediliyor...' && !this.modelLoaded) {
                    text.innerHTML = `
                        Analiz ediliyor...<br>
                        <small style="font-size: 0.8em; opacity: 0.8; margin-top: 10px; display: block;">
                            (İlk kullanımda 8GB model indiriliyor, lütfen bekleyin. Bu işlem 10-15dk sürebilir.)
                        </small>
                    `;
                } else {
                    text.textContent = message;
                }
            }
            overlay.classList.remove('hidden');
            overlay.classList.add('active');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.classList.add('hidden');
        }
        // Model was loaded successfully after any API call
        this.modelLoaded = true;
    }

    showNotification(message, type = 'success') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${this.getNotificationIcon(type)}</span>
            <span>${this.escapeHtml(message)}</span>
        `;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s reverse';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatMarkdown(text) {
        // Simple markdown formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    async apiRequest(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this.API_BASE}${endpoint}`, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
}

// Initialize app when DOM is ready
let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing Med-Gemma...');
        app = new MedGemmaApp();
        window.app = app;
    });
} else {
    console.log('DOM already loaded, initializing Med-Gemma...');
    app = new MedGemmaApp();
    window.app = app;
}

// Export for use in other modules
window.MedGemmaApp = MedGemmaApp;

// Toggle patient context panel - now controlled by checkbox
function setupPatientContextToggle() {
    const checkbox = document.getElementById('usePatientContext');
    const body = document.getElementById('patientContextBody');

    if (checkbox && body) {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                body.classList.remove('hidden');
            } else {
                body.classList.add('hidden');
            }
        });
    }
}

// Call setup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPatientContextToggle);
} else {
    setupPatientContextToggle();
}

// Get patient context data for use in analysis - only if checkbox is checked
function getPatientContext() {
    const checkbox = document.getElementById('usePatientContext');

    // Return null if checkbox is not checked
    if (!checkbox || !checkbox.checked) {
        return null;
    }

    const age = document.getElementById('patientAge')?.value || '';
    const gender = document.getElementById('patientGender')?.value || '';
    const history = document.getElementById('patientHistory')?.value || '';

    // Return null if no data entered
    if (!age && !gender && !history) {
        return null;
    }

    return { age, gender, history };
}
window.getPatientContext = getPatientContext;

// Check if patient context should be used
function isPatientContextEnabled() {
    const checkbox = document.getElementById('usePatientContext');
    return checkbox && checkbox.checked;
}
window.isPatientContextEnabled = isPatientContextEnabled;
