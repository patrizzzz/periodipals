// Centralized chatbot using DeepSeek API
class ChatBot {
    constructor() {
        this.initialized = false;
        this.messages = [];
        this.createChatInterface();
    }

    createChatInterface() {
        // Create chat button
        this.chatButton = document.createElement('button');
        this.chatButton.id = 'chatbotBtn';
        this.chatButton.innerHTML = '✨';
        this.chatButton.setAttribute('aria-label', 'Open chat assistant');
        this.chatButton.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 140px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            transition: all 0.3s ease;
        `;

        // Create chat container
        this.chatContainer = document.createElement('div');
        this.chatContainer.id = 'chatContainer';
        this.chatContainer.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 200px;
            width: 350px;
            max-height: 500px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.15);
            display: none;
            flex-direction: column;
            z-index: 1000;
            overflow: hidden;
        `;

        // Create chat header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <span style="font-weight: 600;">✨ Learning Assistant</span>
            <button id="closeChatBtn" style="background: none; border: none; color: white; cursor: pointer;">×</button>
        `;

        // Create messages container
        this.messagesContainer = document.createElement('div');
        this.messagesContainer.style.cssText = `
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            max-height: 350px;
        `;

        // Create input area
        const inputArea = document.createElement('div');
        inputArea.style.cssText = `
            padding: 15px;
            border-top: 1px solid #eee;
            display: flex;
            gap: 10px;
        `;

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = 'Ask me anything about the topic...';
        this.input.style.cssText = `
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 20px;
            outline: none;
        `;

        const sendButton = document.createElement('button');
        sendButton.innerHTML = '→';
        sendButton.style.cssText = `
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            cursor: pointer;
        `;

        // Assemble the interface
        inputArea.appendChild(this.input);
        inputArea.appendChild(sendButton);
        this.chatContainer.appendChild(header);
        this.chatContainer.appendChild(this.messagesContainer);
        this.chatContainer.appendChild(inputArea);

        // Add to document
        document.body.appendChild(this.chatButton);
        document.body.appendChild(this.chatContainer);

        // Event listeners
        this.chatButton.addEventListener('click', () => this.toggleChat());
        document.getElementById('closeChatBtn').addEventListener('click', () => this.toggleChat());
        sendButton.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    toggleChat() {
        const isVisible = this.chatContainer.style.display === 'flex';
        this.chatContainer.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible && !this.initialized) {
            this.addMessage('bot', 'Hi! I\'m your learning assistant. How can I help you today?');
            this.initialized = true;
        }
    }

    async sendMessage() {
        const message = this.input.value.trim();
        if (!message) return;

        // Add user message
        this.addMessage('user', message);
        this.input.value = '';

        // Show typing indicator
        this.addTypingIndicator();

        try {
            const response = await this.getAIResponse(message);
            this.removeTypingIndicator();
            this.addMessage('bot', response);
        } catch (error) {
            console.error('Chat error:', error);
            this.removeTypingIndicator();
            this.addMessage('bot', 'Sorry, I encountered an error. Please try again.');
        }
    }

    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            margin-bottom: 10px;
            padding: 10px 15px;
            border-radius: 15px;
            max-width: 80%;
            word-wrap: break-word;
            ${type === 'user' ? 
                'background: #667eea; color: white; margin-left: auto;' : 
                'background: #f0f2f5; color: #333; margin-right: auto;'}
        `;
        messageDiv.textContent = content;
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    addTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'typingIndicator';
        indicator.style.cssText = `
            background: #f0f2f5;
            color: #333;
            padding: 10px 15px;
            border-radius: 15px;
            margin-bottom: 10px;
            max-width: 80px;
            margin-right: auto;
        `;
        indicator.innerHTML = 'Typing...';
        this.messagesContainer.appendChild(indicator);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    async getAIResponse(message) {
        try {
            console.log('Making request to /api/chat with message:', message);
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message })
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            const data = await response.json();
            console.log('Response data:', data);
            
            if (!response.ok) {
                console.error('HTTP error:', response.status, data);
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            if (data.status === 'error') {
                console.error('API error:', data.error);
                throw new Error(data.error || 'API returned error status');
            }

            if (!data.response) {
                console.error('No response in data:', data);
                throw new Error('No response received from AI service');
            }

            return data.response;
            
        } catch (error) {
            console.error('Chatbot API error details:', error);
            
            // Provide more specific error messages to user
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your connection and try again.');
            } else if (error.message.includes('timeout')) {
                throw new Error('Request timed out. Please try again.');
            } else if (error.message.includes('authentication')) {
                throw new Error('AI service is temporarily unavailable.');
            } else {
                throw error; // Re-throw to be caught by sendMessage
            }
        }
    }
}

// Initialize and export for module use
window.ChatBot = ChatBot;
let chatbot;

document.addEventListener('DOMContentLoaded', () => {
    if (!chatbot) {
        chatbot = new ChatBot();
        window.chatbot = chatbot;
    }
});

export { ChatBot };