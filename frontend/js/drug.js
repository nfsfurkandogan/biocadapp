// Drug Information Module

class DrugModule {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const searchBtn = document.getElementById('searchDrug');
        const searchInput = document.getElementById('drugSearchInput');

        searchBtn?.addEventListener('click', () => this.searchDrug());

        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchDrug();
            }
        });

        // Popular drug tags
        document.querySelectorAll('.drug-tags .tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const drugName = tag.getAttribute('data-drug');
                if (searchInput) searchInput.value = drugName;
                this.searchDrug();
            });
        });
    }

    async searchDrug() {
        const input = document.getElementById('drugSearchInput');
        const drugName = input?.value.trim();

        if (!drugName) {
            this.app.showNotification('Lütfen bir ilaç adı girin', 'warning');
            return;
        }

        const queryType = document.querySelector('input[name="queryType"]:checked')?.value || 'general';

        this.app.showLoading('İlaç bilgileri sorgulanıyor...');

        try {
            const response = await this.app.apiRequest('/drug-info', 'POST', {
                drug_name: drugName,
                query_type: queryType,
                language: this.app.currentLanguage
            });

            this.app.hideLoading();

            if (response.success) {
                this.displayResults(response.information, drugName, queryType);
                this.app.showNotification('Bilgiler bulundu!', 'success');
            } else {
                throw new Error(response.error || 'Query failed');
            }
        } catch (error) {
            this.app.hideLoading();
            console.error('Drug info error:', error);
            this.app.showNotification('Bilgi alınamadı. Lütfen tekrar deneyin.', 'error');
        }
    }

    displayResults(information, drugName, queryType) {
        const resultsSection = document.getElementById('drugResults');
        const resultContent = document.getElementById('drugResultContent');

        if (!resultsSection || !resultContent) return;

        const queryTypeLabels = {
            general: 'Genel Bilgi',
            side_effects: 'Yan Etkiler',
            interactions: 'İlaç Etkileşimleri',
            dosage: 'Dozaj Bilgisi'
        };

        resultContent.innerHTML = `
            <div style="margin-bottom: var(--spacing-md);">
                <h4 style="color: var(--primary-500); margin-bottom: var(--spacing-sm);">
                    ${this.app.escapeHtml(drugName)}
                </h4>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">
                    ${queryTypeLabels[queryType] || 'Bilgi'}
                </p>
            </div>
            <div style="line-height: 1.8;">
                ${this.app.formatMarkdown(information)}
            </div>
        `;

        resultsSection.classList.remove('hidden');

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Initialize when app is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.app) {
            window.drugModule = new DrugModule(window.app);
        }
    }, 100);
});
