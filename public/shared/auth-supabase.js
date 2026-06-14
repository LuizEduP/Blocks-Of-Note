/* ============================================
   auth-supabase.js — Auth via Supabase
   API compatível com auth.js antigo
   ============================================ */

const Auth = (() => {
    'use strict';

    const STORAGE_KEY = 'blocks_of_note_supabase_auth';
    let _initialized = false;
    let _user = null;
    let _onChangeCallbacks = [];

    // --- Persistência (fallback local) ---

    function loadSession() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.profile) {
                    _user = parsed.profile;
                }
            }
        } catch (e) { /* ignore */ }
    }

    function saveSession(profile) {
        _user = profile;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile }));
        } catch (e) { /* ignore */ }
    }

    function clearSession() {
        _user = null;
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) { /* ignore */ }
    }

    // --- Helpers de perfil ---

    function buildProfile(user) {
        const meta = user.user_metadata || {};
        return {
            name: meta.full_name || meta.name || user.email?.split('@')[0] || 'Usuário',
            email: user.email || '',
            picture: meta.avatar_url || meta.picture || '',
            sub: user.id,
        };
    }

    // --- Callbacks ---

    function notifyChange() {
        _onChangeCallbacks.forEach(fn => {
            try { fn(_user); } catch (e) { console.warn('Auth callback error:', e); }
        });
    }

    function onChange(fn) {
        _onChangeCallbacks.push(fn);
        return () => {
            _onChangeCallbacks = _onChangeCallbacks.filter(f => f !== fn);
        };
    }

    function onSignedIn(user) {
        const profile = buildProfile(user);
        const wasLogged = !!_user;
        saveSession(profile);
        notifyChange();
        if (!wasLogged) {
            Toast.show(`Bem-vindo, ${profile.name}!`, { type: 'success', duration: 2500 });
        }
    }

    // --- Supabase Auth ---

    async function login() {
        const sb = SupabaseClient?.getClient();
        if (!sb) {
            Toast.show('Serviço de autenticação indisponível', { type: 'error', duration: 3000 });
            return;
        }

        // Pega a URL base atual (funciona tanto em localhost quanto no Railway)
        // Ex: "https://blocks-of-note-production.up.railway.app" ou "http://localhost:3000"
        const baseUrl = window.location.origin;

        try {
            const { error } = await sb.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: baseUrl,
                },
            });

            if (error) {
                console.error('Supabase Auth error:', error);
                Toast.show('Erro ao fazer login', { type: 'error', duration: 3000 });
            }
        } catch (err) {
            console.error('Auth login error:', err);
            Toast.show('Erro ao conectar com serviço de autenticação', { type: 'error', duration: 3000 });
        }
    }

    async function logout() {
        const sb = SupabaseClient?.getClient();
        if (sb) {
            await sb.auth.signOut();
        }
        const name = _user?.name;
        clearSession();
        notifyChange();
        Toast.show(name ? `Até logo, ${name}!` : 'Sessão encerrada', { type: 'info', duration: 2000 });
    }

    // --- API Pública (compatível) ---

    function isLoggedIn() {
        return !!_user;
    }

    function getUser() {
        return _user ? { ..._user } : null;
    }

    /**
     * init() — deve ser chamado uma vez no DOMContentLoaded.
     *
     * PROBLEMA RESOLVIDO:
     * O Supabase SDK processa o hash da URL (após redirect OAuth)
     * durante createClient() e dispara SIGNED_IN SYNCHRONOUSLY.
     * Se só registrarmos o listener depois de createClient(),
     * perdemos o evento e a UI nunca é atualizada.
     *
     * SOLUÇÃO:
     * 1. Criamos o client
     * 2. Registramos o listener IMEDIATAMENTE
     * 3. Depois verificamos manualmente getSession()
     *    (que pega o resultado do hash processado)
     * 4. Fallback: se getSession() não retornar nada mas o hash
     *    estiver na URL, fazemos setSession() manual
     */
    async function init() {
        if (_initialized) return;
        _initialized = true;

        console.log('[Auth] init()');

        // ──────────────────────────────────────────────────────────────
        // FIX 1: Detecção de redirect malformado do Supabase OAuth
        //
        // Após login com Google, o Supabase às vezes redireciona para:
        //   https://pnlucbugvswehculgziu.supabase.co/blocks-of-note-production.up.railway.app#access_token=...
        //
        // Em vez de redirecionar corretamente para:
        //   https://blocks-of-note-production.up.railway.app#access_token=...
        //
        // SOLUÇÃO: decodificar o JWT e repassar o profile via URL (query param)
        // ──────────────────────────────────────────────────────────────
        (function fixRedirect() {
            const currentHost = window.location.hostname;
            if (currentHost.includes('supabase.co')) {
                const path = window.location.pathname.replace(/^\//, '');
                if (path && path.includes('.')) {
                    const hash = window.location.hash;
                    // Repassa o hash inteiro para a URL correta
                    const targetUrl = 'https://' + path + hash;
                    console.log('[Auth] Redirect malformado! Indo para:', targetUrl);
                    window.location.replace(targetUrl);
                    return;
                }
            }
        })();

        // ──────────────────────────────────────────────────────────────
        // FIX 2: Decodificação direta do JWT no hash da URL.
        //
        // Quando chegamos aqui (no Railway ou localhost) com um hash
        // do tipo #access_token=... na URL, significa que acabamos de
        // voltar do fluxo OAuth. Decodificamos o JWT manualmente para
        // extrair o perfil e salvar no localStorage, garantindo que a UI
        // mostre o avatar mesmo que o Supabase SDK não dispare SIGNED_IN.
        // ──────────────────────────────────────────────────────────────
        (function decodeJwtFromUrl() {
            const hash = window.location.hash;
            if (hash && hash.includes('access_token')) {
                try {
                    const params = new URLSearchParams(hash.substring(1));
                    const accessToken = params.get('access_token');
                    if (accessToken) {
                        const payload = JSON.parse(atob(accessToken.split('.')[1]));
                        const meta = payload.user_metadata || {};
                        const profile = {
                            name: meta.full_name || meta.name || payload.email?.split('@')[0] || 'Usuário',
                            email: payload.email || '',
                            picture: meta.avatar_url || meta.picture || '',
                            sub: payload.sub,
                        };
                        saveSession(profile);
                        console.log('[Auth] Perfil decodificado do hash e salvo:', profile.name);

                        // Limpa o hash da URL imediatamente
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                } catch (e) {
                    console.warn('[Auth] Erro ao decodificar JWT do hash:', e);
                }
            }
        })();

        const sb = SupabaseClient?.getClient();

        // 1. REGISTRA LISTENER ANTES DE TUDO
        if (sb) {
            console.log('[Auth] registrando onAuthStateChange');
            sb.auth.onAuthStateChange((event, session) => {
                console.log('[Auth] onAuthStateChange event:', event, session?.user?.email);
                if (event === 'SIGNED_IN' && session?.user) {
                    onSignedIn(session.user);
                } else if (event === 'SIGNED_OUT') {
                    clearSession();
                    notifyChange();
                } else if (event === 'TOKEN_REFRESHED' && session?.user && !_user) {
                    onSignedIn(session.user);
                }
            });
        }

        // 2. CARREGA SESSÃO CACHEADA (rápido, UI instantânea)
        loadSession();
        console.log('[Auth] after loadSession, _user:', _user?.name);
        if (_user) {
            setTimeout(() => notifyChange(), 0);
        }

        // 3. RECUPERA SESSÃO DO SUPABASE
        //    (getSession() lê o resultado do hash já processado)
        if (sb) {
            try {
                console.log('[Auth] chamando getSession()');
                console.log('[Auth] current URL hash:', window.location.hash);
                const { data: { session } } = await sb.auth.getSession();
                console.log('[Auth] getSession result:', session?.user?.email || 'null');
                if (session?.user) {
                    onSignedIn(session.user);
                    return;
                }

                // 4. FALLBACK: hash na URL (caso o SDK não tenha processado)
                const hash = window.location.hash;
                console.log('[Auth] fallback - hash:', hash);
                if (hash && hash.includes('access_token')) {
                    console.log('[Auth] tentando setSession com hash');
                    const params = new URLSearchParams(hash.substring(1));
                    const { error } = await sb.auth.setSession({
                        access_token: params.get('access_token') || '',
                        refresh_token: params.get('refresh_token') || '',
                    });

                    if (!error) {
                        window.history.replaceState(null, '', window.location.pathname);
                        const { data: { session: retry } } = await sb.auth.getSession();
                        if (retry?.user) {
                            onSignedIn(retry.user);
                            return;
                        }
                    } else {
                        console.log('[Auth] setSession error:', error);
                    }
                }

                // 5. NADA ENCONTRADO: limpa sessão obsoleta
                if (!_user) {
                    clearSession();
                    notifyChange();
                }
            } catch (e) {
                console.warn('Session recovery error:', e);
            }
        }
        console.log('[Auth] init() finished, _user:', _user?.name || 'null');
    }

    // --- Profile Dropdown ---

    let _dropdownEl = null;
    let _dropdownCleanup = null;

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function createDropdown(user) {
        closeDropdown();

        const dropdown = document.createElement('div');
        dropdown.className = 'auth-dropdown';
        dropdown.id = 'auth-dropdown';
        dropdown.innerHTML = `
            <div class="auth-dropdown-header">
                <img class="auth-dropdown-avatar" src="${user.picture || ''}" alt="${escapeHtml(user.name)}" onerror="this.style.display='none'">
                <div class="auth-dropdown-info">
                    <span class="auth-dropdown-name">${escapeHtml(user.name)}</span>
                    <span class="auth-dropdown-email">${escapeHtml(user.email)}</span>
                </div>
            </div>
            <div class="auth-dropdown-divider"></div>
            <button class="auth-dropdown-item auth-dropdown-logout" id="auth-dropdown-logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sair da conta
            </button>
        `;

        dropdown.querySelector('#auth-dropdown-logout').addEventListener('click', (e) => {
            e.stopPropagation();
            closeDropdown();
            logout();
        });

        document.body.appendChild(dropdown);
        _dropdownEl = dropdown;

        const avatarEl = document.querySelector('.auth-avatar');
        if (avatarEl) {
            const rect = avatarEl.getBoundingClientRect();
            dropdown.style.top = (rect.bottom + 6) + 'px';
            dropdown.style.right = (window.innerWidth - rect.right) + 'px';
        }

        requestAnimationFrame(() => {
            dropdown.classList.add('open');
        });

        _dropdownCleanup = (e) => {
            if (!dropdown.contains(e.target) && !e.target.closest('.auth-avatar') && !e.target.closest('.auth-user')) {
                closeDropdown();
            }
        };
        setTimeout(() => document.addEventListener('click', _dropdownCleanup), 0);
    }

    function closeDropdown() {
        if (_dropdownEl) {
            _dropdownEl.classList.remove('open');
            _dropdownEl.remove();
            _dropdownEl = null;
        }
        if (_dropdownCleanup) {
            document.removeEventListener('click', _dropdownCleanup);
            _dropdownCleanup = null;
        }
    }

    // --- Render ---

    function renderButton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        function render() {
            container.innerHTML = '';
            if (_user) {
                // Avatar clicável do usuário
                const wrapper = document.createElement('div');
                wrapper.className = 'auth-user';

                const avatarBtn = document.createElement('button');
                avatarBtn.className = 'auth-avatar-btn';
                avatarBtn.setAttribute('aria-label', 'Perfil do usuário');
                avatarBtn.setAttribute('title', 'Perfil e conta');

                const avatar = document.createElement('img');
                avatar.className = 'auth-avatar';
                avatar.src = _user.picture || '';
                avatar.alt = _user.name;
                avatar.onerror = function() { this.style.display = 'none'; };

                avatarBtn.appendChild(avatar);
                avatarBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (_dropdownEl && _dropdownEl.classList.contains('open')) {
                        closeDropdown();
                    } else {
                        createDropdown(_user);
                    }
                });

                wrapper.appendChild(avatarBtn);
                container.appendChild(wrapper);
            } else {
                // Botão de login Google
                const btn = document.createElement('button');
                btn.className = 'auth-google-btn';
                btn.setAttribute('aria-label', 'Fazer login com Google');

                const icon = document.createElement('span');
                icon.className = 'auth-google-icon';
                icon.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.56l7.98-5.97z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                `;

                const label = document.createElement('span');
                label.className = 'auth-google-label';
                label.textContent = 'Entrar com Google';

                btn.appendChild(icon);
                btn.appendChild(label);
                btn.addEventListener('click', login);
                container.appendChild(btn);
            }
        }

        render();

        // Re-renderiza quando o estado muda
        const unsubscribe = onChange(() => {
            closeDropdown();
            render();
        });

        // Cleanup se o container for removido
        return () => {
            closeDropdown();
            unsubscribe();
        };
    }

    return {
        init,
        login,
        logout,
        isLoggedIn,
        getUser,
        onChange,
        renderButton,
    };
})();
