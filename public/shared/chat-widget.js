// ============================================
// chat-widget.js — Widget de Chat Flutuante
// Mensagens em tempo real via Supabase
// ============================================

const ChatWidget = (() => {
    'use strict';

    const MAX_VISIBLE_MSGS = 50;

    let _initialized = false;
    let _bubbleEl = null;
    let _popupEl = null;
    let _open = false;
    let _currentFriend = null;  // { name, id }
    let _messages = [];
    let _loading = false;

    // ==========================================
    // DATA — Supabase Realtime
    // ==========================================

    async function loadMessages(friendId) {
        if (!friendId) return [];
        _loading = true;
        renderLoading();
        try {
            const msgs = await ChatStorage.getMessages(friendId, MAX_VISIBLE_MSGS);
            _messages = msgs;
            return msgs;
        } catch (e) {
            console.error('[ChatWidget] Erro ao carregar:', e);
            return [];
        } finally {
            _loading = false;
        }
    }

    async function sendMessage(text) {
        if (!_currentFriend || !_currentFriend.id) {
            Toast.show('Selecione um amigo para conversar', { type: 'warning', duration: 2000 });
            return;
        }

        try {
            const msg = await ChatStorage.sendMessage(
                _currentFriend.id,
                _currentFriend.name,
                text
            );
            _messages.push(msg);
            renderMessages();
            return msg;
        } catch (e) {
            Toast.show('Erro ao enviar mensagem: ' + (e.message || 'desconhecido'), { type: 'error', duration: 3000 });
        }
    }

    function handleRealtimeMessage(msg) {
        // Mensagem já foi adicionada pelo sender
        // Se já está na lista, ignora
        const exists = _messages.some(m => m.id === msg.id);
        if (!exists) {
            _messages.push(msg);
            renderMessages();
        }
    }

    function subscribeRealtime(friendId) {
        ChatStorage.unsubscribe();
        if (friendId) {
            ChatStorage.subscribe(friendId, handleRealtimeMessage);
        }
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
                <button class="chat-widget-back" id="chat-widget-back" aria-label="Voltar" style="display:none">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
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
        popup.querySelector('#chat-widget-back').addEventListener('click', () => {
            // Volta para chat global (limpa amigo)
            _currentFriend = null;
            _messages = [];
            subscribeRealtime(null);
            updateTitle();
            renderMessages();
            document.getElementById('chat-widget-back').style.display = 'none';
        });

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

    async function handleSend(input) {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';

        // Se não está conversando com ninguém, mostra opção
        if (!_currentFriend || !_currentFriend.id) {
            Toast.show('Clique em 💬 ao lado de um amigo no painel de perfil para conversar', { type: 'info', duration: 3000 });
            return;
        }

        // Adiciona otimisticamente
        const optimisticMsg = {
            id: 'opt-' + Date.now(),
            sender_id: ChatStorage.getUserId(),
            sender_name: ChatStorage.getUserName(),
            recipient_id: _currentFriend.id,
            recipient_name: _currentFriend.name,
            content: text,
            created_at: new Date().toISOString(),
        };
        _messages.push(optimisticMsg);
        renderMessages();

        await sendMessage(text);
    }

    function renderLoading() {
        const container = document.getElementById('chat-widget-messages');
        if (!container) return;
        container.innerHTML = '<div class="chat-widget-loading" style="text-align:center;padding:20px;color:var(--color-text-muted)">Carregando...</div>';
    }

    function renderMessages() {
        const container = document.getElementById('chat-widget-messages');
        if (!container) return;

        const userId = ChatStorage.getUserId();

        if (_messages.length === 0) {
            container.innerHTML = `
                <div class="chat-widget-empty">
                    <div class="chat-widget-empty-icon">💬</div>
                    <div class="chat-widget-empty-text">Nenhuma mensagem ainda</div>
                </div>
            `;
            return;
        }

        container.innerHTML = _messages.map(msg => {
            const isMine = msg.sender_id === userId;
            const time = formatTime(msg.created_at);
            const sender = isMine ? 'Você' : (msg.sender_name || 'Amigo');
            return `
                <div class="chat-widget-msg ${isMine ? 'chat-widget-msg-mine' : 'chat-widget-msg-theirs'}">
                    <div class="chat-widget-msg-sender">${escHtml(sender)}</div>
                    <div class="chat-widget-msg-text">${escHtml(msg.content)}</div>
                    <div class="chat-widget-msg-time">${time}</div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    function updateTitle() {
        const titleEl = _popupEl ? _popupEl.querySelector('.chat-widget-title') : null;
        const backBtn = _popupEl ? _popupEl.querySelector('#chat-widget-back') : null;
        if (titleEl) {
            titleEl.textContent = _currentFriend?.name ? `✉️ ${_currentFriend.name}` : 'Chat';
        }
        if (backBtn) {
            backBtn.style.display = _currentFriend?.name ? '' : 'none';
        }
    }

    function formatTime(isoString) {
        try {
            const d = new Date(isoString);
            const hoje = new Date();
            const isHoje = d.toDateString() === hoje.toDateString();
            const horas = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            if (isHoje) return horas;
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + horas;
        } catch (e) {
            return '--:--';
        }
    }

    function escHtml(text) {
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
     * Abre o chat widget.
     * Se friendName for passado, abre conversa com aquela pessoa.
     * Se friendId for passado, usa diretamente.
     */
    async function open(friendName, friendId) {
        if (!_popupEl || !_bubbleEl) return;

        if (friendName) {
            // Procura o ID do amigo
            const fid = friendId || ChatStorage.getFriendId(friendName);
            _currentFriend = { name: friendName, id: fid };
            _messages = [];
            if (fid) {
                await loadMessages(fid);
                subscribeRealtime(fid);
            } else {
                Toast.show('Amigo não encontrado', { type: 'warning', duration: 2000 });
            }
        } else {
            _currentFriend = null;
            _messages = [];
            subscribeRealtime(null);
        }

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
        _messages = [];
        ChatStorage.unsubscribe();
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
    };
})();
