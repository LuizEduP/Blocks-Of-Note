/* ============================================
   friends.js — Gerenciamento de Amigos (local)
   Sidebar lateral direita com busca e adição
   ============================================ */

const Friends = (() => {
    'use strict';

    const STORAGE_KEY = 'commentarium_friends';
    const REQUESTS_KEY = 'commentarium_friend_requests';

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

    async function addFriend(nameOrEmail) {
        const trimmed = nameOrEmail.trim();
        if (!trimmed) {
            Toast.show('Digite um nome ou e-mail', { type: 'warning', duration: 2000 });
            return;
        }

        // Verifica se já existe na lista local
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

        // Busca o usuário no Supabase (profiles)
        let foundUser = null;
        try {
            if (typeof ProfilesSync?.searchUsers === 'function') {
                const results = await ProfilesSync.searchUsers(trimmed, 5);
                // Procura match exato (pelo nome ou email)
                foundUser = results.find(r =>
                    r.name?.toLowerCase() === trimmed.toLowerCase() ||
                    r.email?.toLowerCase() === trimmed.toLowerCase()
                );
            }
        } catch (e) {
            console.warn('[Friends] Erro ao buscar usuário:', e);
        }

        if (foundUser) {
            // Usuário encontrado no Supabase — adiciona direto com o UUID real
            const friend = {
                id: foundUser.id,              // UUID real do Supabase!
                name: foundUser.name,
                email: foundUser.email,
                picture: foundUser.picture || '',
                addedAt: Date.now(),
            };
            _friends.push(friend);
            saveFriends();
            Toast.show(`${friend.name} adicionado(a) aos amigos!`, { type: 'success', duration: 2500 });
            renderProfileFriends();
            return;
        }

        // Não encontrou no Supabase — salva como solicitação local
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
        renderProfileFriends();
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

    let _profilePanelEl = null;

    /**
     * Cria o painel combinado de Perfil + Amigos
     */
    function createProfilePanel(user) {
        // Se já existe, só reabre
        if (_profilePanelEl && document.body.contains(_profilePanelEl)) {
            openProfilePanel();
            return _profilePanelEl;
        }

        closeProfilePanel(); // limpa qualquer residual

        const overlay = document.createElement('div');
        overlay.className = 'profile-overlay';
        overlay.setAttribute('aria-hidden', 'true');

        const panel = document.createElement('aside');
        panel.className = 'profile-panel';
        panel.id = 'profile-panel';
        panel.setAttribute('role', 'complementary');
        panel.setAttribute('aria-label', 'Perfil e amigos');

        const picture = (user && user.picture) ? user.picture : '';
        const name = (user && user.name) ? user.name : 'Usuário';
        const email = (user && user.email) ? user.email : '';

        panel.innerHTML = `
            <!-- Header: Perfil -->
            <div class="profile-header">
                <div class="profile-avatar-wrap">
                    <img class="profile-avatar" src="${picture}" alt="${escapeHtml(name)}" onerror="this.style.display='none'">
                    <div class="profile-avatar-fallback" style="${picture ? 'display:none' : ''}">${escapeHtml(name.charAt(0).toUpperCase())}</div>
                </div>
                <div class="profile-info">
                    <span class="profile-name">${escapeHtml(name)}</span>
                    <span class="profile-email">${escapeHtml(email)}</span>
                </div>
                <button class="profile-close-btn" id="profile-close-btn" aria-label="Fechar">&times;</button>
            </div>

            <!-- Ações: Adicionar amigo -->
            <div class="profile-actions">
                <div class="profile-add-friend">
                    <input type="text" id="profile-add-input" class="input profile-add-input" placeholder="Adicionar amigo por nome ou e-mail..." maxlength="100">
                    <button id="profile-add-btn" class="btn btn-sm btn-primary" aria-label="Adicionar amigo">+</button>
                </div>
            </div>

            <!-- Solicitações -->
            <div class="profile-requests" id="profile-requests-section" style="display:none">
                <h3 class="profile-subtitle">Solicitações</h3>
                <div id="profile-requests-list" class="profile-requests-list"></div>
            </div>

            <!-- Amigos -->
            <div class="profile-friends-wrap">
                <h3 class="profile-subtitle">Amigos</h3>
                <div id="profile-friends-list" class="profile-friends-list">
                    <div class="profile-friends-empty">Nenhum amigo adicionado ainda.</div>
                </div>
            </div>

            <!-- Footer: Logout -->
            <div class="profile-footer">
                <button class="profile-logout-btn" id="profile-logout-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sair da conta
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        _profilePanelEl = panel;

        // ─── Eventos ───

        // Overlay fecha
        overlay.addEventListener('click', closeProfilePanel);

        // Botão fechar
        panel.querySelector('#profile-close-btn').addEventListener('click', closeProfilePanel);

        // Logout
        panel.querySelector('#profile-logout-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            closeProfilePanel();
            Auth.logout();
        });

        // Adicionar amigo
        const addInput = panel.querySelector('#profile-add-input');
        const addBtn = panel.querySelector('#profile-add-btn');
        addBtn.addEventListener('click', () => {
            addFriend(addInput.value);
            addInput.value = '';
        });
        addInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                addFriend(addInput.value);
                addInput.value = '';
            }
        });

        // Abre com animação
        requestAnimationFrame(() => {
            panel.classList.add('open');
            overlay.classList.add('visible');
        });
        document.body.style.overflow = 'hidden';

        renderProfileFriends();

        return panel;
    }

    function openProfilePanel() {
        const panel = _profilePanelEl;
        const overlay = document.querySelector('.profile-overlay');
        if (!panel) return;
        panel.classList.add('open');
        if (overlay) overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
        renderProfileFriends();
    }

    function closeProfilePanel() {
        const panel = _profilePanelEl;
        const overlay = document.querySelector('.profile-overlay');
        if (panel) {
            panel.classList.remove('open');
        }
        if (overlay) {
            overlay.classList.remove('visible');
        }
        document.body.style.overflow = '';
        // Remove after transition
        if (panel) {
            setTimeout(() => {
                if (panel && !panel.classList.contains('open')) {
                    panel.remove();
                    if (overlay) overlay.remove();
                    _profilePanelEl = null;
                }
            }, 300);
        } else {
            if (overlay) overlay.remove();
        }
    }

    function toggleProfilePanel(user) {
        const panel = _profilePanelEl;
        const overlay = document.querySelector('.profile-overlay');
        if (panel && overlay && (panel.classList.contains('open') || overlay.classList.contains('visible'))) {
            closeProfilePanel();
        } else {
            createProfilePanel(user);
        }
    }

    /**
     * Renderiza a lista de amigos DENTRO do profile panel
     */
    function renderProfileFriends() {
        const requestsList = document.getElementById('profile-requests-list');
        const friendsList = document.getElementById('profile-friends-list');
        const requestsSection = document.getElementById('profile-requests-section');

        if (!friendsList) return;

        // Requests
        if (requestsList && requestsSection) {
            if (_requests.length > 0) {
                requestsSection.style.display = '';
                requestsList.innerHTML = _requests.map(r => `
                    <div class="profile-request-item">
                        <div class="profile-request-avatar">${escapeHtml(r.name.charAt(0).toUpperCase())}</div>
                        <div class="profile-request-info">
                            <span class="profile-request-name">${escapeHtml(r.name)}</span>
                            <span class="profile-request-meta">Solicitação pendente</span>
                        </div>
                        <div class="profile-request-actions">
                            <button class="profile-req-accept" data-id="${escapeHtml(r.id)}" aria-label="Aceitar">✓</button>
                            <button class="profile-req-reject" data-id="${escapeHtml(r.id)}" aria-label="Recusar">✕</button>
                        </div>
                    </div>
                `).join('');

                requestsList.querySelectorAll('.profile-req-accept').forEach(btn => {
                    btn.addEventListener('click', () => {
                        acceptRequest(btn.dataset.id);
                        renderProfileFriends();
                    });
                });
                requestsList.querySelectorAll('.profile-req-reject').forEach(btn => {
                    btn.addEventListener('click', () => {
                        rejectRequest(btn.dataset.id);
                        renderProfileFriends();
                    });
                });
            } else {
                requestsSection.style.display = 'none';
            }
        }

        // Friends list
        if (_friends.length === 0) {
            friendsList.innerHTML = '<div class="profile-friends-empty">Nenhum amigo ainda.</div>';
        } else {
            friendsList.innerHTML = _friends.map(f => `
                <div class="profile-friend-item">
                    <div class="profile-friend-avatar">${escapeHtml(f.name.charAt(0).toUpperCase())}</div>
                    <div class="profile-friend-info">
                        <span class="profile-friend-name">${escapeHtml(f.name)}</span>
                        <span class="profile-friend-meta">${escapeHtml(f.email || 'Amigo')}</span>
                    </div>
                    <div class="profile-friend-actions">
                        <button class="profile-friend-chat" data-name="${escapeHtml(f.name)}" aria-label="Conversar com ${escapeHtml(f.name)}" title="Conversar">💬</button>
                        <button class="profile-friend-remove" data-id="${escapeHtml(f.id)}" aria-label="Remover amigo" title="Remover">✕</button>
                    </div>
                </div>
            `).join('');

            friendsList.querySelectorAll('.profile-friend-chat').forEach(btn => {
                btn.addEventListener('click', () => {
                    const name = btn.dataset.name;
                    closeProfilePanel();
                    // Abre o chat widget flutuante já com a conversa da pessoa
                    ChatWidget.open(name);
                });
            });

            friendsList.querySelectorAll('.profile-friend-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    removeFriend(btn.dataset.id);
                    renderProfileFriends();
                });
            });
        }
    }

    function open() {
        // Legacy - se não tem user, abre friends panel normal
        const user = Auth.getUser && Auth.getUser();
        if (user) {
            toggleProfilePanel(user);
        } else {
            // Fallback: friends panel antigo
            _openLegacy();
        }
    }

    function _openLegacy() {
        // Mantém compatibilidade (não usado)
    }

    function close() {
        closeProfilePanel();
    }

    function toggle() {
        const user = Auth.getUser && Auth.getUser();
        if (user) {
            toggleProfilePanel(user);
        } else {
            // Se não logado, não abre
            Toast.show('Faça login para ver seu perfil', { type: 'info', duration: 2000 });
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

        // Botão 👥 removido — o perfil+amigos abre pelo clique no avatar
    }

    return {
        init,
        open,
        close,
        toggle,
        toggleProfilePanel,
        getFriends,
        getRequests,
        addFriend,
        acceptRequest,
        rejectRequest,
        removeFriend,
        onChange,
    };
})();
