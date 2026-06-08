/* ============================================
   toast.js — Componente Toast
   Uso: Toast.show('Mensagem', { duration: 3000, type: 'success' })
   ============================================ */

const Toast = (() => {
    'use strict';

    let container = null;

    /**
     * Garante que o container de toasts exista no DOM
     */
    function ensureContainer() {
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Exibe um toast na tela
     * @param {string} message  Texto a ser exibido
     * @param {object} options  { duration?: number, type?: 'success'|'error'|'info' }
     */
    function show(message, options = {}) {
        const { duration = 3000, type = 'success' } = options;
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = message;

        const parent = ensureContainer();
        parent.appendChild(el);

        // Remove após a duração
        const timeoutId = setTimeout(() => {
            remove(el);
        }, duration);

        // Permite cancelar o timeout se o usuário clicar no toast
        el.addEventListener('click', () => {
            clearTimeout(timeoutId);
            remove(el);
        });

        return el;
    }

    /**
     * Remove um toast com animação
     */
    function remove(el) {
        if (!el || el.classList.contains('toast-out')) return;
        el.classList.add('toast-out');
        el.addEventListener('animationend', () => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, { once: true });
    }

    return { show };
})();
