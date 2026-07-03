// ============================================
// chat/app.js — Chat em Tempo Real
// Mensagens e imagens via Supabase entre amigos
// ============================================

const ChatPage = (() => {
    'use strict';

    const MAX_MSGS = 50;
    const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

    let _currentFriend = null; // { name, id }
    let _messages = [];

    // ==========================================
    // DATA
    // ==========================================

    async function loadMessages(friendId) {
        if (!friendId) return [];
        try {
            const msgs = await ChatStorage.getMessages(friendId, MAX_MSGS);
            _messages = msgs;
            return msgs;
        } catch (e) {
            console.error('[ChatPage] Erro ao carregar:', e);
            return [];
        }
    }

    async function sendMessage(text) {
        if (!_currentFriend || !_currentFriend.id) return;

        const optId = 'opt-' + Date.now();
        const optimistic = {
            id: optId,
            sender_id: ChatStorage.getUserId(),
            sender_name: ChatStorage.getUserName(),
            recipient_id: _currentFriend.id,
            recipient_name: _currentFriend.name,
            content: text,
            created_at: new Date().toISOString(),
        };
        _messages.push(optimistic);
        renderMessages();
        scrollMessages();

        try {
            const msg = await ChatStorage.sendMessage(_currentFriend.id, _currentFriend.name, text);
            const idx = _messages.findIndex(m => m.id === optId);
            if (idx >= 0) { _messages[idx] = msg; renderMessages(); scrollMessages(); }
        } catch (e) {
            _messages = _messages.filter(m => m.id !== optId);
            renderMessages();
            Toast.show(e.message || 'Erro ao enviar', { type: 'error', duration: 3000 });
        }
    }

    async function sendImage(file) {
        if (!_currentFriend || !_currentFriend.id) return;

        if (file.size > MAX_IMAGE_SIZE) {
            Toast.show('Imagem muito grande (máx 2MB)', { type: 'error', duration: 3000 });
            return;
        }

        try {
            const dataUrl = await readFileAsDataURL(file);
            const content = 'data:image;' + dataUrl;
            await sendMessage(content);
        } catch (e) {
            Toast.show('Erro ao enviar imagem', { type: 'error', duration: 3000 });
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

    function onRealtimeMessage(msg) {
        if (!_currentFriend || !_currentFriend.id) return;
        const uid = ChatStorage.getUserId();
        const fid = _currentFriend.id;
        if (!((msg.sender_id === uid && msg.recipient_id === fid) ||
              (msg.sender_id === fid && msg.recipient_id === uid))) return;
        if (_messages.some(m => m.id === msg.id)) return;
        _messages.push(msg);
        renderMessages();
        scrollMessages();
    }

    // ==========================================
    // UI — Friends Sidebar
    // ==========================================

    function renderFriendsList() {
        const list = document.getElementById('chat-friends-list');
        if (!list) return;
        const friends = Friends.getFriends?.() || [];

        if (friends.length === 0) {
            list.innerHTML = '<div class="chat-friends-empty">Nenhum amigo ainda.<br>Adicione amigos no perfil.</div>';
            return;
        }

        list.innerHTML = friends.map(f => `
            <button class="chat-friend-item ${_currentFriend && _currentFriend.id === f.id ? 'active' : ''}"
                    data-id="${escHtml(f.id)}" data-name="${escHtml(f.name)}">
                <div class="chat-friend-avatar">${escHtml(f.name.charAt(0).toUpperCase())}</div>
                <div class="chat-friend-info">
                    <span class="chat-friend-name">${escHtml(f.name)}</span>
                    <span class="chat-friend-email">${escHtml(f.email || '')}</span>
                </div>
            </button>
        `).join('');

        list.querySelectorAll('.chat-friend-item').forEach(btn => {
            btn.addEventListener('click', () => selectFriend(btn.dataset.id, btn.dataset.name));
        });
    }

    async function selectFriend(id, name) {
        _currentFriend = { id, name };
        _messages = [];
        document.getElementById('chat-main-empty').style.display = 'none';
        document.getElementById('chat-main-active').style.display = 'flex';
        document.getElementById('chat-main-friend-name').textContent = name;
        document.getElementById('chat-main-messages').innerHTML =
            '<div style="text-align:center;padding:20px;color:var(--color-text-muted)">Carregando...</div>';

        renderFriendsList();
        await loadMessages(id);
        renderMessages();
        scrollMessages();
        document.getElementById('chat-main-input').focus();
    }

    function goBack() {
        _currentFriend = null;
        _messages = [];
        document.getElementById('chat-main-empty').style.display = 'flex';
        document.getElementById('chat-main-active').style.display = 'none';
        renderFriendsList();
    }

    // ==========================================
    // UI — Messages
    // ==========================================

    function renderMessages() {
        const container = document.getElementById('chat-main-messages');
        if (!container) return;

        const userId = ChatStorage.getUserId();

        if (_messages.length === 0) {
            container.innerHTML = `<div class="chat-widget-empty">
                <div class="chat-widget-empty-icon">💬</div>
                <div class="chat-widget-empty-text">Nenhuma mensagem ainda</div>
            </div>`;
            return;
        }

        container.innerHTML = _messages.map(msg => {
            const isMine = msg.sender_id === userId;
            const time = formatTime(msg.created_at);
            const sender = isMine ? 'Você' : (msg.sender_name || 'Amigo');
            const isImage = msg.content && msg.content.startsWith('data:image;');

            return `
                <div class="chat-msg ${isMine ? 'chat-msg-mine' : 'chat-msg-theirs'}">
                    <div class="chat-msg-sender">${escHtml(sender)}</div>
                    ${isImage
                        ? `<img class="chat-msg-image" src="${escHtml(msg.content.replace('data:image;', ''))}" alt="Imagem" loading="lazy" onclick="this.classList.toggle('expanded')">`
                        : `<div class="chat-msg-text">${escHtml(msg.content)}</div>`}
                    <div class="chat-msg-time">${time}</div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    function scrollMessages() {
        const container = document.getElementById('chat-main-messages');
        if (container) container.scrollTop = container.scrollHeight;
    }

    function handleSend(text) {
        if (!_currentFriend || !_currentFriend.id) return;
        if (!text.trim()) return;
        sendMessage(text.trim());
    }

    // ==========================================
    // UTILS
    // ==========================================

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
    // BIND EVENTS
    // ==========================================

    function bindEvents() {
        const input = document.getElementById('chat-main-input');
        const sendBtn = document.getElementById('chat-main-send');
        const backBtn = document.getElementById('chat-main-back');
        const attachBtn = document.getElementById('chat-main-attach');
        const imageInput = document.getElementById('chat-main-image-input');

        sendBtn.addEventListener('click', () => {
            handleSend(input.value);
            input.value = '';
            input.focus();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSend(input.value);
                input.value = '';
            }
        });

        backBtn.addEventListener('click', goBack);

        attachBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', () => {
            const file = imageInput.files[0];
            if (file) { sendImage(file); imageInput.value = ''; }
        });

        // Refresh friends list when friends change
        Friends.onChange(() => renderFriendsList());
    }

    // ==========================================
    // INIT
    // ==========================================

    function init() {
        bindEvents();
        renderFriendsList();
        ChatStorage.ensureGlobalSubscription();
        ChatStorage.addListener(onRealtimeMessage);
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => ChatPage.init());
