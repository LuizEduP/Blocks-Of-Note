/* ============================================
   friends.js — Gerenciamento de Amigos (local)
   Sidebar lateral direita com busca e adição
   ============================================ */

const Friends = (() => {
    'use strict';

    const STORAGE_KEY = 'blocks_of_note_friends';
    const REQUESTS_KEY = 'blocks_of_note_friend_requests';

    let _friends = [];
    let _requests = [];
    let _initialized = false;
    let _panelEl = null;
    let _btnEl = null;
    let _onChangeCallbacks = [];

    // --- Persistência ---

    function loadFriends() {
        _friends = Storage.safeGet(STORAGE_KEY, []);
        _requests = Storage.safeGet(REQUESTS_KEY, []);
    }

    function saveFriends() {
        Storage.safeSet(STORAGE_KEY, _friends);
        Storage.safeSet(REQUESTS_KEY, _requests);
        notifyChange();
    }

    // --- Notificação ---

    function notifyChange() {
        _onChangeCallbacks.forEach(fn => {
            try { fn(_friends, _requests); } catch (e) { console.warn('Friends callback error:', e); }
        });
    }

    function onChange(fn) {
        _onChangeCallbacks.push(fn);
        return () => {
            _onChangeCallbacks = _onChangeCallbacks.filter(f => f !== fn);
        };
    }

    // --- API ---

    function getFriends() {
        return [..._friends];
    }

    function getRequests() {
        return [..._requests];
    }

    function addFriend(nameOrEmail) {
        const trimmed = nameOrEmail.trim();
        if (!trimmed) {
            Toast.show('Digite um nome ou e-mail', { type: 'warning', duration: 2000 });
            return;
        }

        // Verifica se já existe
        const exists = _friends.some(f => f.name.toLowerCase() === trimmed.toLowerCase() || f.email.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            Toast.show('Este amigo já está na sua lista', { type: 'warning', duration: 2000 });
            return;
        }

        // Verifica se já foi solicitado
        const alreadyRequested = _requests.some(r => r.name.toLowerCase() === trimmed.toLowerCase() || r.email.toLowerCase() === trimmed.toLowerCase());
        if (alreadyRequested) {
            Toast.show('Solicitação já enviada', { type: 'warning', duration: 2000 });
            return;
        }

        // Adiciona como solicitação pendente
        const request = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: trimmed,
            email: trimmed,
            status: 'pending',
            createdAt: Date.now(),
        };

        _requests.push(request);
        saveFriends();
        Toast.show(`Solicitação enviada para ${trimmed}`, { type: 'success', duration: 2000 });
        render();
    }

    function acceptRequest(id) {
        const idx = _requests.findIndex(r => r.id === id);
        if (idx === -1) return;

        const req = _requests[idx];
        const friend = {
            id: req.id,
            name: req.name,
            email: req.email,
            addedAt: Date.now(),
        };

        _friends.push(friend);
        _requests.splice(idx, 1);
        saveFriends();
        Toast.show(`${req.name} adicionado(a) aos amigos!`, { type: 'success', duration: 2000 });
        render();
    }

    function rejectRequest(id) {
        const idx = _requests.findIndex(r => r.id === id);
        if (idx === -1) return;
        _requests.splice(idx, 1);
        saveFriends();
        render();
    }

    function removeFriend(id) {
        _friends = _friends.filter(f => f.id !== id);
        saveFriends();
        Toast.show('Amigo removido', { type: 'info', duration: 2000 });
        render();
    }

    // --- UI ---

    function createPanel() {
        if (_panelEl) return _panelEl;

        const overlay = document.createElement('div');
        overlay.className = 'friends-overlay';
        overlay.setAttribute('aria-hidden', 'true');

        const panel = document.createElement('aside');
        panel.className = 'friends-panel';
        panel.id = 'friends-panel';
        panel.setAttribute('role', 'complementary');
        panel.setAttribute('aria-label', 'Lista de amigos');
        panel.innerHTML = `
            <div class="friends-header">
                <h2 class="friends-title">👥 Amigos</h2>
                <button class="friends-close-btn" id="friends-close-btn" aria-label="Fechar amigos">&times;</button>
            </div>
            <div class="friends-search">
                <input type="text" id="friends-search-input" class="input friends-search-input" placeholder="Adicionar por nome ou e-mail..." maxlength="100">
                <button id="friends-add-btn" class="btn btn-sm btn-primary" aria-label="Adicionar">+</button>
            </div>
            <div class="friends-requests" id="friends-requests-section" style="display:none">
                <h3 class="friends-subtitle">Solicitações</h3>
                <div id="friends-requests-list" class="friends-requests-list"></div>
            </div>
            <div class="friends-list-wrap">
                <h3 class="friends-subtitle">Meus Amigos</h3>
                <div id="friends-list" class="friends-list">
                    <div class="friends-empty">Nenhum amigo adicionado ainda.</div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        _panelEl = panel;

        // Overlay click to close
        overlay.addEventListener('click', close);

        // Close button
        const closeBtn = panel.querySelector('#friends-close-btn');
        closeBtn.addEventListener('click', close);

        // Add button
        const addBtn = panel.querySelector('#friends-add-btn');
        const searchInput = panel.querySelector('#friends-search-input');
        addBtn.addEventListener('click', () => {
            addFriend(searchInput.value);
            searchInput.value = '';
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                addFriend(searchInput.value);
                searchInput.value = '';
            }
        });

        return panel;
    }

    function open() {
        const panel = createPanel();
        const overlay = document.querySelector('.friends-overlay');
        if (!panel) return;
        panel.classList.add('open');
        if (overlay) overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
        render();
    }

    function close() {
        const panel = _panelEl;
        const overlay = document.querySelector('.friends-overlay');
        if (panel) panel.classList.remove('open');
        if (overlay) overlay.classList.remove('visible');
        document.body.style.overflow = '';
    }

    function toggle() {
        if (_panelEl && _panelEl.classList.contains('open')) {
            close();
        } else {
            open();
        }
    }

    function render() {
        const requestsList = document.getElementById('friends-requests-list');
        const friendsList = document.getElementById('friends-list');
        const requestsSection = document.getElementById('friends-requests-section');

        if (!friendsList) return;

        // Requests
        if (requestsList && requestsSection) {
            if (_requests.length > 0) {
                requestsSection.style.display = '';
                requestsList.innerHTML = _requests.map(r => `
                    <div class="friends-request-item">
                        <div class="friends-request-avatar">${r.name.charAt(0).toUpperCase()}</div>
                        <div class="friends-request-info">
                            <span class="friends-request-name">${escapeHtml(r.name)}</span>
                            <span class="friends-request-meta">Solicitação pendente</span>
                        </div>
                        <div class="friends-request-actions">
                            <button class="friends-req-accept" data-id="${r.id}" aria-label="Aceitar">✓</button>
                            <button class="friends-req-reject" data-id="${r.id}" aria-label="Recusar">✕</button>
                        </div>
                    </div>
                `).join('');

                // Event delegation for accept/reject
                requestsList.querySelectorAll('.friends-req-accept').forEach(btn => {
                    btn.addEventListener('click', () => acceptRequest(btn.dataset.id));
                });
                requestsList.querySelectorAll('.friends-req-reject').forEach(btn => {
                    btn.addEventListener('click', () => rejectRequest(btn.dataset.id));
                });
            } else {
                requestsSection.style.display = 'none';
            }
        }

        // Friends list
        if (_friends.length === 0) {
            friendsList.innerHTML = '<div class="friends-empty">Nenhum amigo adicionado ainda.<br>Use o campo acima para adicionar.</div>';
        } else {
            friendsList.innerHTML = _friends.map(f => `
                <div class="friends-item">
                    <div class="friends-item-avatar">${escapeHtml(f.name.charAt(0).toUpperCase())}</div>
                    <div class="friends-item-info">
                        <span class="friends-item-name">${escapeHtml(f.name)}</span>
                        <span class="friends-item-meta">Amigo</span>
                    </div>
                    <button class="friends-item-remove" data-id="${f.id}" aria-label="Remover amigo">✕</button>
                </div>
            `).join('');

            friendsList.querySelectorAll('.friends-item-remove').forEach(btn => {
                btn.addEventListener('click', () => removeFriend(btn.dataset.id));
            });
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Init ---

    function init() {
        if (_initialized) return;
        _initialized = true;

        loadFriends();

        // Create toggle button in navbar
        const toggleContainer = document.getElementById('theme-toggle-container');
        if (toggleContainer) {
            const friendsBtn = document.createElement('button');
            friendsBtn.className = 'friends-toggle-btn';
            friendsBtn.id = 'friends-toggle-btn';
            friendsBtn.setAttribute('aria-label', 'Abrir amigos');
            friendsBtn.innerHTML = '👥';
            friendsBtn.title = 'Amigos';
            friendsBtn.addEventListener('click', toggle);
            toggleContainer.parentNode.insertBefore(friendsBtn, toggleContainer);
        }
    }

    return {
        init,
        open,
        close,
        toggle,
        getFriends,
        getRequests,
        addFriend,
        acceptRequest,
        rejectRequest,
        removeFriend,
        onChange,
    };
})();
