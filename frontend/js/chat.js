// Chat Module - Medical Conversation Interface

class ChatModule {
    constructor(app) {
        this.app = app;
        this.conversationHistory = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('sendChat');
        const input = document.getElementById('chatInput');

        sendBtn?.addEventListener('click', () => this.sendMessage());

        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        input?.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        });
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input?.value.trim();

        if (!message) return;

        // Clear input
        input.value = '';
        input.style.height = 'auto';

        // Add user message to UI
        this.addMessage(message, 'user');

        // Show "typing" indicator temporarily
        const assistantMsgDiv = this.addMessage('', 'assistant'); // Add empty message for assistant
        const contentDiv = assistantMsgDiv.querySelector('.message-content');
        contentDiv.innerHTML = '<span class="typing-indicator">Yanıt yazılıyor...</span>';

        let fullResponse = "";
        const startTime = Date.now(); // Start timer

        try {
            // Use fetch directly for streaming support
            const response = await fetch(`${this.app.API_BASE}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    conversation_history: this.conversationHistory,
                    language: this.app.currentLanguage
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            // Set up stream reading
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // Clear "typing" indicator
            contentDiv.innerHTML = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                fullResponse += text;

                // Update UI with current text (streaming)
                // Note: For better markdown rendering during stream, we can just append text
                // or use marked.parse(fullResponse) periodically.
                // For speed, let's use marked.parse on the full text so far.
                contentDiv.innerHTML = this.app.formatMarkdown(fullResponse);

                // Scroll to bottom
                const container = document.getElementById('chatMessages');
                if (container) container.scrollTop = container.scrollHeight;
            }

            // Stream finished - calculate elapsed time
            const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

            // Add elapsed time indicator
            const timeIndicator = document.createElement('div');
            timeIndicator.className = 'response-time';
            timeIndicator.innerHTML = `<small style="opacity: 0.6; font-size: 0.75em;">${elapsedTime} saniye</small>`;
            contentDiv.appendChild(timeIndicator);

            // Update conversation history
            this.conversationHistory.push({
                user: message,
                assistant: fullResponse
            });

            // Limit history
            if (this.conversationHistory.length > 10) {
                this.conversationHistory = this.conversationHistory.slice(-10);
            }

        } catch (error) {
            console.error('Chat error:', error);
            this.app.showNotification('Mesaj gönderilemedi. Lütfen tekrar deneyin.', 'error');
            const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
            contentDiv.innerHTML += `<br><small style="color:red">Hata oluştu. (${elapsedTime}s)</small>`;
        }
    }

    addMessage(text, type) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = type === 'user' ? 'S' : 'BC';

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = this.app.formatMarkdown(text);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        if (container) container.appendChild(messageDiv);

        // Scroll to bottom
        if (container) container.scrollTop = container.scrollHeight;

        return messageDiv;
    }

    clearChat() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        // Keep only the initial greeting
        const messages = container.querySelectorAll('.message');
        messages.forEach((msg, index) => {
            if (index > 0) msg.remove();
        });

        this.conversationHistory = [];
    }
}

// Initialize when app is ready
function initChatModule() {
    if (window.app) {
        console.log('Initializing chat module...');
        window.chatModule = new ChatModule(window.app);
    } else {
        console.log('Waiting for app...');
        setTimeout(initChatModule, 50);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatModule);
} else {
    initChatModule();
}
