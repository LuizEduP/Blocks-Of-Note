// ============================================
// chat-widget.js — Widget de Chat Flutuante
// Suporte a conversas globais e por amigo
// ============================================

const ChatWidget = (() => {
    'use strict';

    const MAX_VISIBLE_MSGS = 20;

    let _initialized = false;
    let _bubbleEl = null;
    let _popupEl = null;
    let _open = false;
    let _currentFriend = null; // null = chat global

    // ==========================================
    // DATA
    // ==========================================

    function getStorageKey(friendName) {
        if (friendName) {
            const key = friendName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            return `blocks_chat_friend_${key}`;
        }
        return 'blocks_chat_messages';
    }

    function getMessages(friendName) {
        return Storage.safeGet(getStorageKey(friendName), []);
    }

    function saveMessages(messages, friendName) {
        return Storage.safeSet(getStorageKey(friendName), messages);
    }

    function addMessage(text, friendName) {
        const messages = getMessages(friendName);
        const msg = {
            id: Date.now(),
            text: text.trim().substring(0, 500),
            timestamp: new Date().toISOString(),
        };
        messages.push(msg);
        saveMessages(messages, friendName);
        return msg;
    }

    function clearMessages(friendName) {
        saveMessages([], friendName);
    }

    // ==========================================
    // UI
    // ==========================================

    function createWidget() {
        if (document.getElementById('chat-widget-bubble')) return;

        // Bubble button
        const bubble = document.createElement('button');
        bubble.id = 'chat-widget-bubble';
        bubble.className = 'chat-widget-bubble';
        bubble.setAttribute('aria-label', 'Abrir chat');
        bubble.setAttribute('title', 'Chat');
        bubble.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
        `;

        // Popup
        const popup = document.createElement('div');
        popup.id = 'chat-widget-popup';
        popup.className = 'chat-widget-popup';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-label', 'Janela de chat');
        popup.innerHTML = `
            <div class="chat-widget-header">
                <span class="chat-widget-title">Chat</span>
                <button class="chat-widget-close" aria-label="Fechar chat">&times;</button>
            </div>
            <div class="chat-widget-messages" id="chat-widget-messages">
                <div class="chat-widget-empty">
                    <div class="chat-widget-empty-icon">💬</div>
                    <div class="chat-widget-empty-text">Nenhuma mensagem ainda</div>
                </div>
            </div>
            <div class="chat-widget-input-wrap">
                <input type="text" id="chat-widget-input" class="chat-widget-input"
                       placeholder="Digite sua mensagem..." maxlength="500">
                <button id="chat-widget-send" class="chat-widget-send" aria-label="Enviar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(bubble);
        document.body.appendChild(popup);

        _bubbleEl = bubble;
        _popupEl = popup;

        // Events
        bubble.addEventListener('click', toggle);

        popup.querySelector('.chat-widget-close').addEventListener('click', close);

        const input = popup.querySelector('#chat-widget-input');
        const sendBtn = popup.querySelector('#chat-widget-send');

        sendBtn.addEventListener('click', () => {
            handleSend(input);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSend(input);
            }
        });
    }

    function handleSend(input) {
        const text = input.value.trim();
        if (!text) return;
        addMessage(text, _currentFriend);
        input.value = '';
        renderMessages();
    }

    function renderMessages() {
        const container = document.getElementById('chat-widget-messages');
        if (!container) return;

        const messages = getMessages(_currentFriend);
        const recent = messages.slice(-MAX_VISIBLE_MSGS);

        if (recent.length === 0) {
            container.innerHTML = `
                <div class="chat-widget-empty">
                    <div class="chat-widget-empty-icon">💬</div>
                    <div class="chat-widget-empty-text">Nenhuma mensagem ainda</div>
                </div>
            `;
            return;
        }

        container.innerHTML = recent.map(msg => {
            const time = formatTime(msg.timestamp);
            return `
                <div class="chat-widget-msg">
                    <div class="chat-widget-msg-text">${escapeHtml(msg.text)}</div>
                    <div class="chat-widget-msg-time">${time}</div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    function updateTitle() {
        const titleEl = _popupEl ? _popupEl.querySelector('.chat-widget-title') : null;
        if (titleEl) {
            titleEl.textContent = _currentFriend ? `✉️ ${_currentFriend}` : 'Chat';
        }
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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==========================================
    // OPEN / CLOSE / TOGGLE
    // ==========================================

    function toggle() {
        if (_open) close();
        else open();
    }

    /**
     * Abre o chat widget. Se friendName for passado, abre conversa com aquela pessoa.
     */
    function open(friendName) {
        if (!_popupEl || !_bubbleEl) return;

        _currentFriend = friendName || null;
        _popupEl.classList.add('open');
        _bubbleEl.classList.add('active');
        _open = true;

        updateTitle();
        renderMessages();

        setTimeout(() => {
            const input = document.getElementById('chat-widget-input');
            if (input) input.focus();
        }, 300);
    }

    function close() {
        if (!_popupEl || !_bubbleEl) return;
        _popupEl.classList.remove('open');
        _bubbleEl.classList.remove('active');
        _open = false;
        _currentFriend = null;
    }

    // ==========================================
    // INIT
    // ==========================================

    function init() {
        if (_initialized) return;
        _initialized = true;

        createWidget();
    }

    return {
        init,
        open,
        close,
        toggle,
        getMessages,
        addMessage,
        clearMessages,
        renderMessages,
        updateTitle,
    };
})();
