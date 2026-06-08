// ============================================
// chat/app.js — Chat Local
// Chat com armazenamento no localStorage
// ============================================

const ChatApp = (() => {
    'use strict';

    const STORAGE_KEY = 'blocks_chat_messages';

    const elements = {
        container: document.getElementById('chat-messages'),
        input: document.getElementById('chat-input'),
        btnSend: document.getElementById('btn-send-chat'),
        btnClear: document.getElementById('btn-clear-chat'),
    };

    // ==========================================
    // DATA LAYER
    // ==========================================

    function getMessages() {
        return Storage.safeGet(STORAGE_KEY, []);
    }

    function saveMessages(messages) {
        return Storage.safeSet(STORAGE_KEY, messages);
    }

    function addMessage(text) {
        const messages = getMessages();
        const msg = {
            id: Date.now(),
            text: text.trim().substring(0, 500),
            timestamp: new Date().toISOString(),
        };
        messages.push(msg);
        saveMessages(messages);
        return msg;
    }

    function clearMessages() {
        saveMessages([]);
    }

    // ==========================================
    // UI LAYER
    // ==========================================

    function renderMessages(messages) {
        elements.container.innerHTML = '';

        if (messages.length === 0) {
            elements.container.innerHTML = `
                <div class="chat-empty">
                    <div class="chat-empty-icon">💬</div>
                    <div class="chat-empty-title">Nenhuma mensagem ainda</div>
                    <div class="chat-empty-desc">Comece a conversa agora!</div>
                </div>
            `;
            return;
        }

        messages.forEach(msg => {
            const el = document.createElement('div');
            el.className = 'chat-msg';
            const time = formatTime(msg.timestamp);
            el.innerHTML = `
                <div class="chat-msg-text">${Utils.escapeHtml(msg.text)}</div>
                <div class="chat-msg-time">${time}</div>
            `;
            elements.container.appendChild(el);
        });

        scrollToBottom();
    }

    function scrollToBottom() {
        elements.container.scrollTop = elements.container.scrollHeight;
    }

    function formatTime(isoString) {
        try {
            return new Date(isoString).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (e) {
            return '--:--';
        }
    }

    function loadAndRender() {
        const messages = getMessages();
        renderMessages(messages);
    }

    // ==========================================
    // CONTROLLER
    // ==========================================

    function handleSend() {
        const text = elements.input.value.trim();
        if (!text) return;

        addMessage(text);
        elements.input.value = '';
        renderMessages(getMessages());
        Toast.show('Mensagem enviada', { type: 'success', duration: 1500 });
    }

    function handleClear() {
        if (getMessages().length === 0) {
            Toast.show('Nenhuma mensagem para limpar', { type: 'info', duration: 2000 });
            return;
        }

        clearMessages();
        renderMessages([]);
        Toast.show('Histórico limpo', { type: 'info', duration: 2000 });
    }

    function bindEvents() {
        elements.btnSend.addEventListener('click', handleSend);
        elements.btnClear.addEventListener('click', handleClear);

        elements.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
            }
        });
    }

    function init() {
        loadAndRender();
        bindEvents();
        elements.input.focus();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => ChatApp.init());
