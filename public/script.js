// script.js - Detective Jai Web Interface
// Uses relative path (same domain, no CORS issues)

const BOT_API_URL = '/api/chat';
const STATS_API_URL = '/api/stats';

// Load stats on page load
async function loadStats() {
    try {
        const response = await fetch(STATS_API_URL);
        const data = await response.json();
        if (data.scammers) {
            document.getElementById('scammerCount').innerText = data.scammers;
        }
    } catch (err) {
        console.log('Stats not available');
        document.getElementById('scammerCount').innerText = '--';
    }
}

// Send message to API
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    // Add user message to chat
    addMessage(message, 'user');
    input.value = '';
    showTyping(true);

    try {
        const response = await fetch(BOT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message, userId: 'web_user' })
        });

        const data = await response.json();
        showTyping(false);

        if (data.response) {
            addMessage(data.response, 'bot');
        } else if (data.error) {
            addMessage(`⚠️ ${data.error}\n\n📱 Try our Telegram bot: @JoshuaGiwaBot`, 'bot');
        } else {
            addMessage('⚠️ Unexpected response. Please try again.', 'bot');
        }
    } catch (err) {
        showTyping(false);
        console.error('Fetch error:', err);
        addMessage('⚠️ Connection error. Please try again. Telegram bot: @JoshuaGiwaBot', 'bot');
    }
}

function quickCommand(command) {
    document.getElementById('chatInput').value = command;
    sendMessage();
}

function addMessage(text, sender) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Format markdown-like text
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    
    contentDiv.innerHTML = formattedText;
    messageDiv.appendChild(contentDiv);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showTyping(show) {
    const typingDiv = document.getElementById('chatTyping');
    typingDiv.style.display = show ? 'flex' : 'none';
}

function clearChat() {
    const messagesDiv = document.getElementById('chatMessages');
    messagesDiv.innerHTML = '';
    addMessage("👋 Chat cleared! Type /help to see commands or ask me about any suspicious message.", 'bot');
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Load stats when page loads
loadStats();
