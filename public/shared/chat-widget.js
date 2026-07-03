// ============================================
// chat-widget.js — Widget de Chat Flutuante
// Mensagens e imagens em tempo real via Supabase
// ============================================

const ChatWidget = (() => {
    'use strict';

    const MAX_VISIBLE_MSGS = 50;
    const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

    let _initialized = false;
    let _bubbleEl = null;
    let _popupEl = null;
    let _open = false;
    let _currentFriend = null;  // { name, id }
    let _messages = [];
    let _loading = false;

    // ==========================================
    // DATA
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

        const optId = 'opt-' + Date.now();
        const optimisticMsg = {
            id: optId,
            sender_id: ChatStorage.getUserId(),
            sender_name: ChatStorage.getUserName(),
            recipient_id: _currentFriend.id,
            recipient_name: _currentFriend.name,
            content: text,
            created_at: new Date().toISOString(),
        };
        _messages.push(optimisticMsg);
        renderMessages();
        scrollMessages();

        try {
            const msg = await ChatStorage.sendMessage(_currentFriend.id, _currentFriend.name, text);
            const idx = _messages.findIndex(m => m.id === optId);
            if (idx >= 0) {
                _messages[idx] = msg;
                renderMessages();
                scrollMessages();
            }
            return msg;
        } catch (e) {
            console.error('[ChatWidget] Erro ao enviar:', e);
            _messages = _messages.filter(m => m.id !== optId);
            renderMessages();
            Toast.show(e.message || 'Erro ao enviar', { type: 'error', duration: 3000 });
        }
    }

    async function sendImage(file) {
        if (!_currentFriend || !_currentFriend.id) {
            Toast.show('Selecione um amigo para conversar', { type: 'warning', duration: 2000 });
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            Toast.show('Imagem muito grande (máx 2MB)', { type: 'error', duration: 3000 });
            return;
        }

        Toast.show('Enviando imagem...', { type: 'info', duration: 1000 });

        try {
            const dataUrl = await readFileAsDataURL(file);
            // Store image as a data URL in content (prefixed for detection)
            const content = 'data:image;' + dataUrl;

            const optId = 'opt-img-' + Date.now();
            const optimisticMsg = {
                id: optId,
                sender_id: ChatStorage.getUserId(),
                sender_name: ChatStorage.getUserName(),
                recipient_id: _currentFriend.id,
                recipient_name: _currentFriend.name,
                content: content,
                created_at: new Date().toISOString(),
            };
            _messages.push(optimisticMsg);
            renderMessages();
            scrollMessages();

            const msg = await ChatStorage.sendMessage(_currentFriend.id, _currentFriend.name, content);
            const idx = _messages.findIndex(m => m.id === optId);
            if (idx >= 0) {
                _messages[idx] = msg;
                renderMessages();
                scrollMessages();
            }
        } catch (e) {
            console.error('[ChatWidget] Erro ao enviar imagem:', e);
            Toast.show(e.message || 'Erro ao enviar imagem', { type: 'error', duration: 3000 });
        }
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsDataURL(file);
        });
    }

    // ==========================================
    // REALTIME
    // ==========================================

    function onRealtimeMessage(msg) {
        // Ignore if not from/to current friend
        if (!_currentFriend || !_currentFriend.id) return;
        const uid = ChatStorage.getUserId();
        const fid = _currentFriend.id;
        // Must be between us and the current friend
        if (!((msg.sender_id === uid && msg.recipient_id === fid) ||
              (msg.sender_id === fid && msg.recipient_id === uid))) return;
        // Skip duplicates
        if (_messages.some(m => m.id === msg.id)) return;
        _messages.push(msg);
        renderMessages();
        scrollMessages();
        // Toast notification if widget is closed
        if (!_open && _bubbleEl) {
            _bubbleEl.classList.add('has-notification');
            setTimeout(() => _bubbleEl.classList.remove('has-notification'), 5000);
        }
    }

    function scrollMessages() {
        const container = document.getElementById('chat-widget-messages');
        if (container) container.scrollTop = container.scrollHeight;
    }

    // ==========================================
    // UI RENDER
    // ==========================================

    function createWidget() {
        if (document.getElementById('chat-widget-bubble')) return;

        // Bubble button
        const bubble = document.createElement('button');
        bubble.id = 'chat-widget-bubble';
        bubble.className = 'chat-widget-bubble';
        bubble.setAttribute('aria-label', 'Abrir chat');
        bubble.setAttribute('title', 'Chat');
        bubble.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

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
                <input type="file" id="chat-widget-image-input" accept="image/*" hidden>
                <button id="chat-widget-attach" class="chat-widget-attach" title="Enviar imagem">📎</button>
                <input type="text" id="chat-widget-input" class="chat-widget-input"
                       placeholder="Digite sua mensagem..." maxlength="2000">
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
            _currentFriend = null;
            _messages = [];
            updateTitle();
            renderMessages();
            document.getElementById('chat-widget-back').style.display = 'none';
            // Add back friend list hint
            const container = document.getElementById('chat-widget-messages');
            if (container) {
                container.innerHTML = `<div class="chat-widget-empty">
                    <div class="chat-widget-empty-icon">💬</div>
                    <div class="chat-widget-empty-text">Selecione um amigo</div>
                    <div class="chat-widget-empty-desc">Abra seu perfil e clique em 💬 ao lado de um amigo</div>
                </div>`;
            }
        });

        const input = popup.querySelector('#chat-widget-input');
        const sendBtn = popup.querySelector('#chat-widget-send');
        const attachBtn = popup.querySelector('#chat-widget-attach');
        const imageInput = popup.querySelector('#chat-widget-image-input');

        sendBtn.addEventListener('click', () => handleSend(input));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSend(input); }
        });

        attachBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', () => {
            const file = imageInput.files[0];
            if (file) { sendImage(file); imageInput.value = ''; }
        });
    }

    async function handleSend(input) {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        input.focus();

        if (!_currentFriend || !_currentFriend.id) {
            Toast.show('Clique em 💬 ao lado de um amigo no painel de perfil para conversar', { type: 'info', duration: 3000 });
            return;
        }

        await sendMessage(text);
    }

    function renderLoading() {
        const container = document.getElementById('chat-widget-messages');
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-muted)">Carregando...</div>';
    }

    function renderMessages() {
        const container = document.getElementById('chat-widget-messages');
        if (!container) return;

        const userId = ChatStorage.getUserId();

        if (_messages.length === 0) {
            container.innerHTML = _currentFriend
                ? `<div class="chat-widget-empty"><div class="chat-widget-empty-icon">💬</div><div class="chat-widget-empty-text">Nenhuma mensagem ainda</div></div>`
                : `<div class="chat-widget-empty"><div class="chat-widget-empty-icon">💬</div><div class="chat-widget-empty-text">Selecione um amigo</div><div class="chat-widget-empty-desc">Abra seu perfil e clique em 💬 ao lado de um amigo</div></div>`;
            return;
        }

        container.innerHTML = _messages.map(msg => {
            const isMine = msg.sender_id === userId;
            const time = formatTime(msg.created_at);
            const sender = isMine ? 'Você' : (msg.sender_name || 'Amigo');
            const isImage = msg.content && msg.content.startsWith('data:image;');

            return `
                <div class="chat-widget-msg ${isMine ? 'chat-widget-msg-mine' : 'chat-widget-msg-theirs'}">
                    <div class="chat-widget-msg-sender">${escHtml(sender)}</div>
                    ${isImage
                        ? `<img class="chat-widget-msg-image" src="${escHtml(msg.content.replace('data:image;', ''))}" alt="Imagem enviada" loading="lazy" onclick="this.classList.toggle('expanded')">`
                        : `<div class="chat-widget-msg-text">${escHtml(msg.content)}</div>`}
                    <div class="chat-widget-msg-time">${time}</div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    function updateTitle() {
        const titleEl = _popupEl ? _popupEl.querySelector('.chat-widget-title') : null;
        const backBtn = _popupEl ? _popupEl.querySelector('#chat-widget-back') : null;
        if (titleEl) titleEl.textContent = _currentFriend?.name ? `✉️ ${_currentFriend.name}` : 'Chat';
        if (backBtn) backBtn.style.display = _currentFriend?.name ? '' : 'none';
    }

    function formatTime(isoString) {
        try {
            const d = new Date(isoString);
            const hoje = new Date();
            const isHoje = d.toDateString() === hoje.toDateString();
            const horas = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            if (isHoje) return horas;
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + horas;
        } catch (e) { return '--:--'; }
    }

    function escHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    // ==========================================
    // OPEN / CLOSE / TOGGLE
    // ==========================================

    function toggle() {
        if (_open) close();
        else open();
    }

    async function open(friendName, friendId) {
        if (!_popupEl || !_bubbleEl) return;

        // Ensure global subscription is active
        ChatStorage.ensureGlobalSubscription();

        if (friendName) {
            const fid = friendId || ChatStorage.getFriendId(friendName);
            _currentFriend = { name: friendName, id: fid };
            _messages = [];
            if (fid) {
                await loadMessages(fid);
            } else {
                Toast.show('Amigo não encontrado no servidor', { type: 'warning', duration: 2000 });
            }
        } else {
            _currentFriend = null;
            _messages = [];
        }

        _popupEl.classList.add('open');
        _bubbleEl.classList.add('active');
        _bubbleEl.classList.remove('has-notification');
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
    }

    // ==========================================
    // INIT
    // ==========================================

    function init() {
        if (_initialized) return;
        _initialized = true;
        createWidget();
        // Register listener AFTER widget is created
        ChatStorage.addListener(onRealtimeMessage);
        // Start global subscription when logged in
        Auth.onChange((user) => {
            if (user) ChatStorage.ensureGlobalSubscription();
        });
    }

    return { init, open, close, toggle };
})();
