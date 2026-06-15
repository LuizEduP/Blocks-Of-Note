/* ============================================
   chat-storage-supabase.js — Chat em Tempo Real
   Mensagens diretas entre usuários via Supabase
   ============================================ */

const ChatStorage = (() => {
    'use strict';

    const TABLE = 'direct_messages';
    let _subscription = null;
    let _listeners = [];

    // ─── Helpers ───

    function getSb() {
        const sb = SupabaseClient?.getClient();
        if (!sb) {
            console.warn('[ChatStorage] Supabase não disponível');
            return null;
        }
        return sb;
    }

    function getUserId() {
        const user = Auth.getUser?.();
        return user?.sub || null;
    }

    function getUserName() {
        const user = Auth.getUser?.();
        return user?.name || 'Anônimo';
    }

    // ─── API ───

    /**
     * Verifica se uma string é um UUID válido (versão 4)
     */
    function isValidUUID(str) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
    }

    /**
     * Busca o UUID real de um amigo pelo nome ou email na tabela profiles
     */
    async function resolveFriendId(friendNameOrEmail) {
        // Primeiro, tenta na lista local de amigos
        const friends = Friends.getFriends?.() || [];
        const localFriend = friends.find(f =>
            f.name?.toLowerCase() === friendNameOrEmail?.toLowerCase() ||
            f.email?.toLowerCase() === friendNameOrEmail?.toLowerCase()
        );
        if (localFriend && isValidUUID(localFriend.id)) {
            return localFriend.id;
        }

        // Pega o email do amigo na lista local (se entrou como email)
        const localEmail = localFriend?.email || '';

        // Se não achou UUID válido localmente, busca no Supabase
        try {
            if (typeof ProfilesSync?.searchUsers === 'function') {
                const results = await ProfilesSync.searchUsers(friendNameOrEmail, 5);
                // Tenta match por nome
                let match = results.find(r =>
                    r.name?.toLowerCase() === friendNameOrEmail?.toLowerCase()
                );
                // Se não achou por nome, tenta por email
                if (!match) {
                    match = results.find(r =>
                        r.email?.toLowerCase() === friendNameOrEmail?.toLowerCase()
                    );
                }
                // Se ainda não achou, tenta pelo email salvo localmente
                if (!match && localEmail) {
                    match = results.find(r =>
                        r.email?.toLowerCase() === localEmail?.toLowerCase()
                    );
                }
                if (match && match.id) {
                    return match.id;
                }
            }
        } catch (e) {
            console.warn('[ChatStorage] Erro ao buscar amigo no Supabase:', e);
        }

        return null;
    }

    /**
     * Envia uma mensagem para outro usuário
     * @param {string} recipientId - ID do destinatário
     * @param {string} recipientName - Nome do destinatário
     * @param {string} content - Conteúdo da mensagem
     */
    async function sendMessage(recipientId, recipientName, content) {
        const sb = getSb();
        if (!sb) {
            throw new Error('Chat indisponível');
        }

        const senderId = getUserId();
        const senderName = getUserName();

        if (!senderId) {
            throw new Error('Faça login para enviar mensagens');
        }

        // Valida se o recipientId é um UUID válido
        let resolvedId = recipientId;
        if (!isValidUUID(recipientId)) {
            // Tenta resolver o UUID real pelo nome
            const realId = await resolveFriendId(recipientName);
            if (realId) {
                resolvedId = realId;
                // Atualiza o amigo na lista local com o UUID real
                const friends = Friends.getFriends?.() || [];
                const idx = friends.findIndex(f =>
                    f.name?.toLowerCase() === recipientName?.toLowerCase()
                );
                if (idx >= 0) {
                    friends[idx].id = realId;
                    // Se Friends tem save, salva
                    try { Friends.removeFriend?.(friends[idx].id); } catch (e) {}
                }
            } else {
                throw new Error(`Amigo "${recipientName}" não encontrado no Supabase. Peça para ele fazer login com Google primeiro.`);
            }
        }

        const { data, error } = await sb
            .from(TABLE)
            .insert({
                sender_id: senderId,
                sender_name: senderName,
                recipient_id: resolvedId,
                recipient_name: recipientName,
                content: content.trim().substring(0, 500),
            })
            .select()
            .single();

        if (error) {
            console.error('[ChatStorage] Erro ao enviar:', error);
            throw error;
        }

        return data;
    }

    /**
     * Carrega mensagens entre o usuário logado e um amigo
     * @param {string} friendId - ID do amigo
     * @param {number} limit - limite de mensagens
     */
    async function getMessages(friendId, limit = 50) {
        const sb = getSb();
        if (!sb) return [];

        const userId = getUserId();
        if (!userId) return [];

        const { data, error } = await sb
            .from(TABLE)
            .select('*')
            .or(`and(sender_id.eq.${userId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${userId})`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[ChatStorage] Erro ao carregar:', error);
            return [];
        }

        // Inverte para ordem cronológica
        return (data || []).reverse();
    }

    /**
     * Inscreve-se para receber novas mensagens em tempo real
     * @param {string} friendId - ID do amigo
     * @param {function} onMessage - callback quando chegar mensagem nova
     */
    function subscribe(friendId, onMessage) {
        unsubscribe();

        const sb = getSb();
        if (!sb) return;

        const userId = getUserId();
        if (!userId) return;

        // Filtro: mensagens onde o usuário logado é sender ou recipient
        // E o amigo é o outro participante
        const filter = `and(or(sender_id.eq.${userId},recipient_id.eq.${userId}),or(sender_id.eq.${friendId},recipient_id.eq.${friendId}))`;

        _subscription = sb
            .channel(`chat-${userId}-${friendId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: TABLE,
                    filter: filter,
                },
                (payload) => {
                    const msg = payload.new;
                    // Não notifica para mensagens enviadas por si mesmo
                    if (msg.sender_id !== userId) {
                        try { onMessage(msg); } catch (e) { console.warn(e); }
                    }
                }
            )
            .subscribe();

        _listeners.push(onMessage);
    }

    function unsubscribe() {
        const sb = getSb();
        if (_subscription && sb) {
            sb.removeChannel(_subscription);
            _subscription = null;
        }
        _listeners = [];
    }

    /**
     * Obtém o recipient_id a partir do nome do amigo
     * (busca na lista de amigos local ou no perfil)
     */
    function getFriendId(friendName) {
        const friends = Friends.getFriends?.() || [];
        const friend = friends.find(f =>
            f.name?.toLowerCase() === friendName?.toLowerCase()
        );
        return friend?.id || null;
    }

    return {
        sendMessage,
        getMessages,
        subscribe,
        unsubscribe,
        getFriendId,
        getUserId,
        getUserName,
    };
})();
