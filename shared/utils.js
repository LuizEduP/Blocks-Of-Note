/* ============================================
   utils.js — Funções utilitárias compartilhadas
   Uso: Utils.escapeHtml('texto')
         Utils.formatDate('2026-06-06')
   ============================================ */

const Utils = (() => {
    'use strict';

    /**
     * Sanitiza string para uso seguro em innerHTML
     * @param {string} str Texto a ser sanitizado
     * @returns {string}
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Formata data ISO para o padrão brasileiro (DD/MM/AAAA)
     * @param {string} isoString Data em formato ISO ou YYYY-MM-DD
     * @returns {string}
     */
    function formatDate(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleDateString('pt-BR');
    }

    /**
     * Formata data relativa (Hoje, Ontem, X dias atrás, ou data completa)
     * @param {string} isoString Data em formato ISO
     * @returns {string}
     */
    function formatRelativeDate(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        const now = new Date();
        const diff = now - d;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Hoje';
        if (days === 1) return 'Ontem';
        if (days < 7) return `${days} dias atrás`;
        return d.toLocaleDateString('pt-BR');
    }

    return {
        escapeHtml,
        formatDate,
        formatRelativeDate,
    };
})();
