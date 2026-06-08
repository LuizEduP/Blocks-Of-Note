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

    // --- Supabase Auth ---

    async function login() {
        const sb = SupabaseClient?.getClient();
        if (!sb) {
            Toast.show('Serviço de autenticação indisponível', { type: 'error', duration: 3000 });
            return;
        }

        try {
            const { data, error } = await sb.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });

            if (error) {
                console.error('Supabase Auth error:', error);
                Toast.show('Erro ao fazer login', { type: 'error', duration: 3000 });
            }
            // Redirect happens automatically
        } catch (err) {
            console.error('Auth login error:', err);
            Toast.show('Erro ao conectar com serviço de autenticação', { type: 'error', duration: 3000 });
        }
    }

    async function handleSession() {
        const sb = SupabaseClient?.getClient();
        if (!sb) return;

        try {
            const { data: { session } } = await sb.auth.getSession();

            if (session?.user) {
                const user = session.user;
                const profile = {
                    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
                    email: user.email || '',
                    picture: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
                    sub: user.id,
                };
                saveSession(profile);
                notifyChange();
                return profile;
            } else {
                // Check if there's a hash with access_token (OAuth redirect)
                const hash = window.location.hash;
                if (hash && hash.includes('access_token')) {
                    const { data, error } = await sb.auth.setSession({
                        access_token: new URLSearchParams(hash.substring(1)).get('access_token') || '',
                        refresh_token: new URLSearchParams(hash.substring(1)).get('refresh_token') || '',
                    });

                    if (error) {
                        console.error('Session setup error:', error);
                    }

                    // Clean URL
                    window.history.replaceState(null, '', window.location.pathname);
                }

                // Try again after setting session
                const { data: { session: retrySession } } = await sb.auth.getSession();
                if (retrySession?.user) {
                    const user = retrySession.user;
                    const profile = {
                        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
                        email: user.email || '',
                        picture: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
                        sub: user.id,
                    };
                    saveSession(profile);
                    notifyChange();
                    return profile;
                }
            }
        } catch (e) {
            console.warn('Session check error:', e);
        }

        return null;
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

    async function init() {
        if (_initialized) return;
        _initialized = true;

        // Carrega sessão salva localmente
        loadSession();

        // Tenta obter sessão do Supabase
        try {
            const sessionProfile = await handleSession();
            if (sessionProfile) {
                // Já foi salvo e notificado pelo handleSession
            }
        } catch (e) {
            console.warn('Supabase init error:', e);
        }

        // Escuta mudanças de auth em tempo real (logout, refresh, etc.)
        try {
            const sb = SupabaseClient?.getClient();
            if (sb) {
                sb.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_IN' && session?.user) {
                        const user = session.user;
                        const profile = {
                            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
                            email: user.email || '',
                            picture: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
                            sub: user.id,
                        };
                        saveSession(profile);
                        notifyChange();
                    } else if (event === 'SIGNED_OUT') {
                        clearSession();
                        notifyChange();
                    } else if (event === 'TOKEN_REFRESHED' && session?.user && !_user) {
                        // Recupera sessão após refresh
                        const user = session.user;
                        const profile = {
                            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
                            email: user.email || '',
                            picture: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
                            sub: user.id,
                        };
                        saveSession(profile);
                        notifyChange();
                    }
                });
            }
        } catch (e) {
            console.warn('Auth state listener error:', e);
        }

        // Se já logado, notifica
        if (_user) {
            setTimeout(() => notifyChange(), 0);
        }
    }

    // --- Render (compatível) ---

    function renderButton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        function render() {
            container.innerHTML = '';
            if (_user) {
                const wrapper = document.createElement('div');
                wrapper.className = 'auth-user';

                const avatar = document.createElement('img');
                avatar.className = 'auth-avatar';
                avatar.src = _user.picture || '';
                avatar.alt = _user.name;
                avatar.onerror = () => { avatar.style.display = 'none'; };

                const info = document.createElement('div');
                info.className = 'auth-info';

                const nameEl = document.createElement('span');
                nameEl.className = 'auth-name';
                nameEl.textContent = _user.name;

                const emailEl = document.createElement('span');
                emailEl.className = 'auth-email';
                emailEl.textContent = _user.email;

                info.appendChild(nameEl);
                info.appendChild(emailEl);

                const logoutBtn = document.createElement('button');
                logoutBtn.className = 'auth-logout-btn';
                logoutBtn.textContent = 'Sair';
                logoutBtn.setAttribute('aria-label', 'Sair da conta');
                logoutBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    logout();
                });

                wrapper.appendChild(avatar);
                wrapper.appendChild(info);
                wrapper.appendChild(logoutBtn);
                container.appendChild(wrapper);
            } else {
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
        const unsubscribe = onChange(() => render());
        return unsubscribe;
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
