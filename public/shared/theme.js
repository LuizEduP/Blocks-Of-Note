/* ============================================
   theme.js — Alternância de tema (Light/Dark)
   Persiste a preferência no localStorage
   ============================================ */

window.Theme = {
    STORAGE_KEY: 'commentarium-theme',

    /** Retorna o tema atual armazenado ou 'light' */
    getCurrent() {
        return localStorage.getItem(this.STORAGE_KEY) || 'light';
    },

    /** Aplica o tema no <html> e persiste */
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        this._updateButton(theme);
    },

    /** Alterna entre light/dark */
    toggle() {
        const next = this.getCurrent() === 'dark' ? 'light' : 'dark';
        this.setTheme(next);
    },

    /** Renderiza o botão de alternância no container */
    _renderButton() {
        const container = document.getElementById('theme-toggle-container');
        if (!container) return;

        const btn = document.createElement('button');
        btn.className = 'theme-toggle-btn';
        btn.setAttribute('aria-label', 'Alternar tema');
        btn.setAttribute('title', 'Alternar tema claro/escuro');
        btn.innerHTML = this.getCurrent() === 'dark'
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

        btn.addEventListener('click', () => this.toggle());

        // Clear and append
        container.innerHTML = '';
        container.appendChild(btn);
    },

    /** Atualiza o ícone do botão conforme o tema */
    _updateButton(theme) {
        const btn = document.querySelector('.theme-toggle-btn');
        if (!btn) return;
        btn.innerHTML = theme === 'dark'
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    },

    /** Inicializa: define o tema salvo e renderiza o botão */
    init() {
        const saved = this.getCurrent();
        this.setTheme(saved);
        this._renderButton();
    }
};
