/* ============================================
   auth.js — Google Sign-In via Identity Services
   Uso: Auth.renderButton('#login-container')
         Auth.isLoggedIn() => boolean
         Auth.getUser()    => { name, email, picture } | null
         Auth.logout()
   ============================================
   CONFIGURAÇÃO:
   1. Acesse https://console.cloud.google.com/apis/credentials
   2. Crie um OAuth 2.0 Client ID (tipo: Aplicativo Web)
   3. Adicione a origem autorizada (ex: http://localhost:3000)
   4. Copie o Client ID para GOOGLE_CLIENT_ID abaixo
   ============================================ */

const GOOGLE_CLIENT_ID = '264095391579-ok60k94lad3ejjao85te2apg90o1tq73.apps.googleusercontent.com';


const Auth = (() => {
    'use strict';

    const STORAGE_KEY = 'blocks_of_note_auth';
    const SCOPES = 'profile email';

    let _initialized = false;
    let _user = null;
    let _onChangeCallbacks = [];

    // --- Persistência ---

    function loadSession() {
        const saved = Storage.safeGet(STORAGE_KEY, null);
        if (saved && saved.profile) {
            _user = saved.profile;
        }
    }

    function saveSession(profile) {
        _user = profile;
        Storage.safeSet(STORAGE_KEY, { profile });
    }

    function clearSession() {
        _user = null;
        Storage.safeRemove(STORAGE_KEY);
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

    // --- Google Sign-In (Token-based) ---

    async function login() {
        if (!GOOGLE_CLIENT_ID) {
            Toast.show(
                'Configure o Google Client ID em shared/auth.js',
                { type: 'error', duration: 5000 }
            );
            return;
        }

        try {
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: handleTokenResponse,
            });
            tokenClient.requestAccessToken();
        } catch (err) {
            console.error('Google Auth error:', err);
            Toast.show('Erro ao fazer login com Google', { type: 'error', duration: 3000 });
        }
    }

    function handleTokenResponse(response) {
        if (response.error) {
            console.error('Google Auth error:', response.error);
            Toast.show('Login cancelado ou erro de autenticação', { type: 'error', duration: 3000 });
            return;
        }

        // Decodifica o ID token JWT para obter perfil
        try {
            const payload = JSON.parse(atob(response.id_token.split('.')[1]));
            const profile = {
                name: payload.name || payload.given_name || 'Usuário',
                email: payload.email || '',
                picture: payload.picture || '',
                sub: payload.sub,
            };
            saveSession(profile);
            notifyChange();
            Toast.show(`Bem-vindo, ${profile.name}!`, { type: 'success', duration: 2500 });
        } catch (err) {
            console.error('Failed to decode token:', err);
            Toast.show('Erro ao processar login', { type: 'error', duration: 3000 });
        }
    }

    // --- Logout ---

    function logout() {
        if (!_user) return;

        const name = _user.name;
        clearSession();
        notifyChange();
        Toast.show(`Até logo, ${name}!`, { type: 'info', duration: 2000 });
    }

    // --- API Pública ---

    function isLoggedIn() {
        return !!_user;
    }

    function getUser() {
        return _user ? { ..._user } : null;
    }

    function init() {
        if (_initialized) return;
        _initialized = true;

        // Carrega sessão salva
        loadSession();

        // Se já logado, notifica
        if (_user) {
            setTimeout(() => notifyChange(), 0);
        }
    }

    // --- Render ---

    function renderButton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        function render() {
            container.innerHTML = '';
            if (_user) {
                // Avatar do usuário
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
        const unsubscribe = onChange(() => render());

        // Cleanup se o container for removido
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
