/**
 * EduMitra — Chatbot Widget
 * Floating chat bubble with message handling.
 */

class ChatbotWidget {
    constructor(studentId) {
        this.studentId = studentId;
        this.isOpen = false;
        this.init();
    }

    init() {
        // Create trigger button
        this.trigger = document.createElement('button');
        this.trigger.className = 'chatbot-trigger';
        this.trigger.innerHTML = '🤖';
        this.trigger.title = 'Chat with EduMitra Advisor';
        this.trigger.addEventListener('click', () => this.toggle());

        // Create panel
        this.panel = document.createElement('div');
        this.panel.className = 'chatbot-panel';
        this.panel.innerHTML = `
            <div class="chatbot-header">
                <span style="font-size:1.5rem">🎓</span>
                <div>
                    <div style="font-weight:700;font-size:1rem">EduMitra Advisor</div>
                    <div style="font-size:0.75rem;opacity:0.8">AI-powered academic guidance</div>
                </div>
                <button onclick="window._chatbot.toggle()" style="margin-left:auto;background:none;border:none;color:white;font-size:1.2rem;cursor:pointer">✕</button>
            </div>
            <div class="chatbot-messages" id="chatMessages"></div>
            <div class="chatbot-input-area">
                <input type="text" id="chatInput" placeholder="Ask about your performance..." autocomplete="off">
                <button onclick="window._chatbot.send()" id="chatSendBtn">➤</button>
            </div>
        `;

        document.body.appendChild(this.trigger);
        document.body.appendChild(this.panel);

        // Enter key
        const input = document.getElementById('chatInput');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.send();
        });

        // Welcome message
        setTimeout(() => {
            this.addMessage('bot', '👋 Hi! I\'m your **EduMitra Academic Advisor**.\n\nType `help` to see what I can do, or ask me about:\n• Your performance summary\n• Improvement roadmap\n• Exam tips\n• Attendance advice');
        }, 500);

        window._chatbot = this;
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.panel.classList.toggle('active', this.isOpen);
        this.trigger.innerHTML = this.isOpen ? '✕' : '🤖';
        if (this.isOpen) {
            setTimeout(() => document.getElementById('chatInput')?.focus(), 300);
        }
    }

    addMessage(type, text) {
        const container = document.getElementById('chatMessages');
        const msg = document.createElement('div');
        msg.className = `chat-msg ${type}`;
        // Simple markdown-like bold
        msg.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
    }

    async send() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;

        this.addMessage('user', message);
        input.value = '';

        // Show typing indicator
        const typingId = 'typing-' + Date.now();
        const container = document.getElementById('chatMessages');
        const typing = document.createElement('div');
        typing.className = 'chat-msg bot';
        typing.id = typingId;
        typing.innerHTML = '<span class="animate-pulse">Thinking...</span>';
        container.appendChild(typing);
        container.scrollTop = container.scrollHeight;

        try {
            const data = await API.sendChatMessage(this.studentId, message);
            document.getElementById(typingId)?.remove();
            this.addMessage('bot', data.response);
        } catch (err) {
            document.getElementById(typingId)?.remove();
            this.addMessage('bot', '❌ Sorry, something went wrong. Please try again.');
        }
    }
}

window.ChatbotWidget = ChatbotWidget;
