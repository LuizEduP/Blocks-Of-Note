/* ============================================
   profiles-sync.js — Sincroniza perfil com Supabase
   e busca usuários para adicionar como amigos
   ============================================ */

const ProfilesSync = (() => {
    'use strict';

    const TABLE = 'profiles';

    function getSb() {
        const sb = SupabaseClient?.getClient();
        if (!sb) return null;
        return sb;
    }

    /**
     * Upsert do perfil do usuário logado na tabela profiles
     */
    async function syncMyProfile() {
        const sb = getSb();
        if (!sb) return;

        const user = Auth.getUser?.();
        if (!user || !user.sub) return;

        try {
            const { error } = await sb
                .from(TABLE)
                .upsert({
                    id: user.sub,
                    name: user.name || 'Usuário',
                    email: user.email || '',
                    picture: user.picture || '',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' });

            if (error) {
                console.warn('[ProfilesSync] Erro ao sync perfil:', error);
            }
        } catch (e) {
            console.warn('[ProfilesSync] Erro:', e);
        }
    }

    /**
     * Busca usuários por nome ou email (para adicionar como amigo)
     * @param {string} query - nome ou email para buscar
     * @param {number} limit - limite de resultados
     * @returns {Array} lista de { id, name, email, picture }
     */
    async function searchUsers(query, limit = 10) {
        const sb = getSb();
        if (!sb) return [];

        const userId = Auth.getUser?.()?.sub;
        if (!userId) return [];

        try {
            const { data, error } = await sb
                .from(TABLE)
                .select('id, name, email, picture')
                .neq('id', userId)  // não inclui a si mesmo
                .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(limit);

            if (error) {
                console.warn('[ProfilesSync] Erro ao buscar:', error);
                return [];
            }

            return data || [];
        } catch (e) {
            console.warn('[ProfilesSync] Erro ao buscar:', e);
            return [];
        }
    }

    return {
        syncMyProfile,
        searchUsers,
    };
})();
