/* ============================================
   storage.js — Data Layer Genérico
   Utilitários seguros de localStorage
   Dependências: shared/toast.js (deve ser carregado antes)
   Uso: Storage.safeGet('chave', [])
         Storage.safeSet('chave', dados)
         Storage.safeRemove('chave')
   ============================================ */

const Storage = (() => {
    'use strict';

    /**
     * Recupera dados do localStorage com fallback
     * @param {string} key      Chave do localStorage
     * @param {*}      fallback Valor padrão se não existir ou erro
     * @returns {*}
     */
    function safeGet(key, fallback = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (e) {
            console.error(`Storage.get("${key}") failed:`, e);
            return fallback;
        }
    }

    /**
     * Salva dados no localStorage com segurança
     * @param {string} key   Chave do localStorage
     * @param {*}      value Dados a serem salvos
     * @returns {boolean} true se salvou com sucesso
     */
    function safeSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                if (typeof Toast !== 'undefined' && Toast.show) {
                    Toast.show('Espaço de armazenamento cheio. Libere espaço ou exporte seus dados.', {
                        type: 'error',
                        duration: 4000,
                    });
                } else {
                    console.error('QuotaExceededError: Espaco de armazenamento cheio.');
                }
            } else {
                console.error(`Storage.set("${key}") failed:`, e);
                if (typeof Toast !== 'undefined' && Toast.show) {
                    Toast.show('Erro ao salvar dados.', { type: 'error', duration: 3000 });
                }
            }
            return false;
        }
    }

    /**
     * Remove uma chave do localStorage com segurança
     * @param {string} key Chave a remover
     */
    function safeRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error(`Storage.remove("${key}") failed:`, e);
        }
    }

    return { safeGet, safeSet, safeRemove };
})();
