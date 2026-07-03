/* ============================================
   chat-storage-supabase.js — Chat em Tempo Real
   Mensagens diretas + imagens via Supabase
   ============================================ */

const ChatStorage = (() => {
    'use strict';

    const TABLE = 'direct_messages';
    const MAX_MSG_LENGTH = 2000;
    const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB max for base64 images
    let _channel = null;
    let _listeners = [];
    let _globalSubscribed = false;

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

    function isValidUUID(str) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
    }

    // ─── Global Realtime Subscription (receives ALL DMs, filters client-side) ───

    function ensureGlobalSubscription() {
        if (_globalSubscribed) return;
        _globalSubscribed = true;

        const sb = getSb();
        if (!sb) return;

        const userId = getUserId();
        if (!userId) return;

        console.log('[ChatStorage] Inscrevendo para mensagens em tempo real...');

        _channel = sb
            .channel('direct-messages-global')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: TABLE },
                (payload) => {
                    const msg = payload.new;
                    // Skip own messages (they're handled optimistically)
                    if (msg.sender_id === userId) return;
                    // Notify if this message is for us
                    if (msg.recipient_id === userId) {
                        console.log('[ChatStorage] Nova mensagem recebida de:', msg.sender_name);
                        _listeners.forEach(fn => {
                            try { fn(msg); } catch (e) { console.warn(e); }
                        });
                    }
                }
            )
            .subscribe((status) => {
                console.log('[ChatStorage] Subscription status:', status);
            });
    }

    function addListener(fn) {
        _listeners.push(fn);
    }

    function removeListener(fn) {
        _listeners = _listeners.filter(f => f !== fn);
    }

    function unsubscribe() {
        const sb = getSb();
        if (_channel && sb) {
            sb.removeChannel(_channel).catch(() => {});
            _channel = null;
        }
        _listeners = [];
        _globalSubscribed = false;
    }

    // ─── Friend ID Resolution ───

    async function resolveFriendId(friendNameOrEmail) {
        const friends = Friends.getFriends?.() || [];
        const localFriend = friends.find(f =>
            f.name?.toLowerCase() === friendNameOrEmail?.toLowerCase() ||
            f.email?.toLowerCase() === friendNameOrEmail?.toLowerCase()
        );
        if (localFriend && isValidUUID(localFriend.id)) {
            return localFriend.id;
        }

        try {
            if (typeof ProfilesSync?.searchUsers === 'function') {
                const results = await ProfilesSync.searchUsers(friendNameOrEmail, 5);
                let match = results.find(r =>
                    r.name?.toLowerCase() === friendNameOrEmail?.toLowerCase() ||
                    r.email?.toLowerCase() === friendNameOrEmail?.toLowerCase()
                );
                if (match && match.id) return match.id;
            }
        } catch (e) {
            console.warn('[ChatStorage] Erro ao buscar amigo:', e);
        }

        return localFriend?.id || null;
    }

    // ─── Send Messages ───

    async function sendMessage(recipientId, recipientName, content) {
        const sb = getSb();
        if (!sb) throw new Error('Chat indisponível');

        const senderId = getUserId();
        const senderName = getUserName();
        if (!senderId) throw new Error('Faça login para enviar mensagens');

        let resolvedId = recipientId;
        if (!isValidUUID(recipientId)) {
            const realId = await resolveFriendId(recipientName);
            if (realId) {
                resolvedId = realId;
            } else {
                throw new Error(`Amigo "${recipientName}" não encontrado. Peça para ele fazer login primeiro.`);
            }
        }

        if (resolvedId === senderId) {
            throw new Error('Você não pode enviar mensagem para si mesmo');
        }

        const trimmed = (content || '').trim().substring(0, MAX_MSG_LENGTH);
        if (!trimmed) throw new Error('Mensagem vazia');

        const { data, error } = await sb
            .from(TABLE)
            .insert({
                sender_id: senderId,
                sender_name: senderName,
                recipient_id: resolvedId,
                recipient_name: recipientName,
                content: trimmed,
            })
            .select()
            .single();

        if (error) {
            console.error('[ChatStorage] Erro ao enviar:', error);
            throw error;
        }

        return data;
    }

    // ─── Load Messages ───

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

        return (data || []).reverse();
    }

    // ─── Friend helpers ───

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
        addListener,
        removeListener,
        ensureGlobalSubscription,
        unsubscribe,
        getFriendId,
        getUserId,
        getUserName,
    };
})();
