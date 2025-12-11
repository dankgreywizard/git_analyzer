let currentAbortController = null;
let messageHistory = [];
let currentChatId = null;
let chatHistory = [];

// DOM Elements
const chatContainer = document.getElementById('chat-container');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send-btn');
const cancelBtn = document.getElementById('cancel-btn');
const statusIndicator = document.getElementById('status-indicator');
const charCount = document.getElementById('char-count');
const newChatBtn = document.getElementById('new-chat-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const chatSidebar = document.getElementById('chat-sidebar');
const chatHistoryList = document.getElementById('chat-history-list');
const chatModal = document.getElementById('chat-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const loadChatBtn = document.getElementById('load-chat-btn');
const modalChatContent = document.getElementById('modal-chat-content');
const modalChatTitle = document.getElementById('modal-chat-title');
const modalChatTimestamp = document.getElementById('modal-chat-timestamp');
let currentViewedChat = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadChatHistory();
    setupEventListeners();
    updateCharCount();
    autoResizeTextarea();
    renderChatHistory();
});

function setupEventListeners() {
    sendBtn.addEventListener('click', sendMessage);
    cancelBtn.addEventListener('click', cancelRequest);
    newChatBtn.addEventListener('click', startNewChat);
    sidebarToggle.addEventListener('click', toggleSidebar);
    closeModalBtn.addEventListener('click', closeModal);
    loadChatBtn.addEventListener('click', loadChatIntoInterface);
    
    // Close modal on background click
    chatModal.addEventListener('click', (e) => {
        if (e.target === chatModal) {
            closeModal();
        }
    });
    
    // Enter to send, Shift+Enter for new line
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Auto-resize textarea
    input.addEventListener('input', () => {
        updateCharCount();
        autoResizeTextarea();
    });
}

function toggleSidebar() {
    chatSidebar.classList.toggle('hidden');
}

function updateCharCount() {
    const count = input.value.length;
    charCount.textContent = `${count} character${count !== 1 ? 's' : ''}`;
}

function autoResizeTextarea() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
}

function updateStatus(status, color = 'gray') {
    const indicator = statusIndicator.querySelector('div');
    const text = statusIndicator.querySelector('span');
    
    indicator.className = `w-2 h-2 ${color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'} rounded-full`;
    text.textContent = status;
}

function addMessage(content, role = 'user') {
    // Remove empty state if it exists
    const emptyState = chatContainer.querySelector('.text-center');
    if (emptyState) {
        emptyState.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`;
    
    const messageBubble = document.createElement('div');
    messageBubble.className = `max-w-3xl rounded-2xl px-4 py-3 ${
        role === 'user' 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none shadow-sm'
    }`;
    
    if (role === 'assistant') {
        messageBubble.classList.add('message-content');
    }
    
    messageBubble.textContent = content;
    messageDiv.appendChild(messageBubble);
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
    
    return messageBubble;
}

function scrollToBottom() {
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

function startNewChat() {
    // Save current chat if it has messages
    if (messageHistory.length > 0) {
        saveCurrentChat();
    }
    
    // Clear current chat
    messageHistory = [];
    currentChatId = null;
    chatContainer.innerHTML = `
        <div class="text-center text-gray-500 py-12">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p class="text-lg font-medium">Start a conversation</p>
            <p class="text-sm mt-1">Ask me anything and I'll help you out!</p>
        </div>
    `;
    input.value = '';
    updateCharCount();
    autoResizeTextarea();
    updateStatus('Ready', 'gray');
    renderChatHistory();
}

function saveCurrentChat() {
    if (messageHistory.length === 0) return;
    
    const chatData = {
        id: currentChatId || Date.now().toString(),
        messages: [...messageHistory],
        timestamp: currentChatId ? 
            chatHistory.find(c => c.id === currentChatId)?.timestamp || Date.now() :
            Date.now(),
        title: messageHistory[0]?.content?.substring(0, 50) || 'New Chat'
    };
    
    // Remove old chat if updating
    if (currentChatId) {
        chatHistory = chatHistory.filter(c => c.id !== currentChatId);
    }
    
    // Add to beginning of history
    chatHistory.unshift(chatData);
    
    // Keep only last 50 chats
    if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(0, 50);
    }
    
    saveChatHistory();
    currentChatId = chatData.id;
}

function loadChatHistory() {
    try {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            chatHistory = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading chat history:', e);
        chatHistory = [];
    }
}

function saveChatHistory() {
    try {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    } catch (e) {
        console.error('Error saving chat history:', e);
    }
}

function renderChatHistory() {
    chatHistoryList.innerHTML = '';
    
    if (chatHistory.length === 0) {
        chatHistoryList.innerHTML = `
            <div class="text-center text-gray-400 py-8 text-sm">
                No chat history yet
            </div>
        `;
        return;
    }
    
    chatHistory.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors mb-2 group ${
            chat.id === currentChatId ? 'bg-blue-50 border border-blue-200' : ''
        }`;
        const timestamp = new Date(chat.timestamp);
        const timeStr = timestamp.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'flex items-start justify-between';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'flex-1 min-w-0';
        textDiv.innerHTML = `
            <div class="font-medium text-gray-900 text-sm truncate">${chat.title}</div>
            <div class="text-xs text-gray-500 mt-1">${timeStr}</div>
        `;
        
        const loadBtn = document.createElement('button');
        loadBtn.className = 'ml-2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity';
        loadBtn.title = 'Load into chat';
        loadBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        `;
        loadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            loadChatById(chat.id);
        });
        
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(loadBtn);
        chatItem.appendChild(contentDiv);
        
        // Make the whole item clickable to view
        chatItem.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                viewPastChat(chat);
            }
        });
        
        chatHistoryList.appendChild(chatItem);
    });
}

function viewPastChat(chat) {
    currentViewedChat = chat;
    modalChatTitle.textContent = chat.title;
    const timestamp = new Date(chat.timestamp);
    modalChatTimestamp.textContent = timestamp.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
    
    modalChatContent.innerHTML = '';
    
    chat.messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`;
        
        const messageBubble = document.createElement('div');
        messageBubble.className = `max-w-3xl rounded-2xl px-4 py-3 ${
            msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none shadow-sm'
        }`;
        
        if (msg.role === 'assistant') {
            messageBubble.classList.add('message-content');
        }
        
        messageBubble.textContent = msg.content;
        messageDiv.appendChild(messageBubble);
        modalChatContent.appendChild(messageDiv);
    });
    
    chatModal.classList.remove('hidden');
    chatModal.classList.add('flex');
}

function loadChatIntoInterface() {
    if (!currentViewedChat) return;
    loadChatById(currentViewedChat.id);
    closeModal();
}

function loadChatById(chatId) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;
    
    // Save current chat if it has messages and is different
    if (messageHistory.length > 0 && currentChatId !== chatId) {
        saveCurrentChat();
    }
    
    // Load the selected chat
    currentChatId = chat.id;
    messageHistory = [...chat.messages];
    
    // Clear and repopulate the chat container
    chatContainer.innerHTML = '';
    
    chat.messages.forEach(msg => {
        addMessage(msg.content, msg.role);
    });
    
    // Update sidebar to highlight current chat
    renderChatHistory();
    
    // Scroll to bottom
    scrollToBottom();
    
    // Focus input
    input.focus();
    
    updateStatus('Ready', 'gray');
}

function closeModal() {
    chatModal.classList.add('hidden');
    chatModal.classList.remove('flex');
    currentViewedChat = null;
}

async function sendMessage() {
    const userInput = input.value.trim();
    if (!userInput || sendBtn.disabled) return;
    
    // Create chat ID if this is a new chat
    if (!currentChatId) {
        currentChatId = Date.now().toString();
    }
    
    // Add user message to UI
    addMessage(userInput, 'user');
    messageHistory.push({ role: 'user', content: userInput });
    
    // Clear input
    input.value = '';
    updateCharCount();
    autoResizeTextarea();
    
    // Disable input and send button
    input.disabled = true;
    sendBtn.disabled = true;
    cancelBtn.classList.remove('hidden');
    cancelBtn.disabled = false;
    
    updateStatus('Sending...', 'yellow');
    
    // Create AI message bubble
    const aiMessageBubble = addMessage('', 'assistant');
    
    // Create abort controller
    const controller = new AbortController();
    currentAbortController = controller;
    
    try {
        const messages = messageHistory.map(msg => JSON.stringify(msg));
        
        // Use /read endpoint - webpack proxy will forward to backend if needed
        const response = await fetch('/read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messages),
            signal: controller.signal
        });
        
        if (!response.ok) {
            throw new Error(response.statusText || 'Request failed');
        }
        
        updateStatus('Streaming...', 'yellow');
        
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Streaming not supported');
        }
        
        const decoder = new TextDecoder();
        let aiResponse = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            aiResponse += chunk;
            aiMessageBubble.textContent = aiResponse;
            scrollToBottom();
        }
        
        // Flush decoder
        const finalChunk = decoder.decode();
        if (finalChunk) {
            aiResponse += finalChunk;
            aiMessageBubble.textContent = aiResponse;
        }
        
        // Add to message history
        messageHistory.push({ role: 'assistant', content: aiResponse });
        
        // Save chat after receiving response
        saveCurrentChat();
        renderChatHistory();
        
        updateStatus('Ready', 'green');
        
        // Add typing indicator removal
        setTimeout(() => {
            updateStatus('Ready', 'gray');
        }, 2000);
        
    } catch (error) {
        if (error.name === 'AbortError' || error.code === 'ABORT_ERR') {
            aiMessageBubble.textContent = 'Request canceled by user.';
            aiMessageBubble.className += ' opacity-75';
            updateStatus('Canceled', 'gray');
        } else {
            console.error('Request error:', error);
            const errorMsg = error.message || 'Request failed';
            aiMessageBubble.textContent = `Error: ${errorMsg}`;
            aiMessageBubble.className = aiMessageBubble.className.replace('bg-white', 'bg-red-50 border-red-200');
            updateStatus('Error', 'gray');
        }
    } finally {
        // Re-enable controls
        input.disabled = false;
        sendBtn.disabled = false;
        cancelBtn.classList.add('hidden');
        cancelBtn.disabled = true;
        currentAbortController = null;
        input.focus();
    }
}

function cancelRequest() {
    if (currentAbortController) {
        currentAbortController.abort();
    }
}
