/* ============================================
   notes-storage-supabase.js — Notes via Supabase
   Fallback para localStorage quando offline
   API compatível com notes-storage.js
   ============================================ */

const NotesStorage = (() => {
    const LOCAL_KEY = 'my_3d_notes';
    const TABLE = 'notes';

    // --- Helpers ---

    function getUserId() {
        const user = Auth.getUser();
        return user?.sub || null;
    }

    function isOnline() {
        return SupabaseClient.isAvailable() && getUserId();
    }

    // --- Supabase operations ---

    async function fetchFromSupabase() {
        const sb = SupabaseClient.getClient();
        if (!sb || !getUserId()) return null;

        const { data, error } = await sb
            .from(TABLE)
            .select('*')
            .eq('user_id', getUserId())
            .order('updated_at', { ascending: false });

        if (error) {
            console.warn('Supabase fetch notes error:', error);
            return null;
        }
        return data;
    }

    async function saveToSupabase(notes, userId) {
        const sb = SupabaseClient.getClient();
        if (!sb) return false;

        // Upsert all notes
        const records = notes.map(n => ({
            id: n.id,
            user_id: userId,
            title: n.title || '',
            content: n.content || '',
            created_at: n.createdAt || n.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }));

        const { error } = await sb.from(TABLE).upsert(records, { onConflict: 'id' });
        if (error) {
            console.warn('Supabase save notes error:', error);
            return false;
        }
        return true;
    }

    // --- Public API (síncrona para compatibilidade) ---

    function getNotes() {
        const local = Storage.safeGet(LOCAL_KEY, []);
        return local;
    }

    function saveNotes(notes) {
        return Storage.safeSet(LOCAL_KEY, notes);
    }

    function createNote() {
        const notes = getNotes();
        const note = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2),
            title: '',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        notes.unshift(note);
        saveNotes(notes);
        syncToServer();
        return note;
    }

    function updateNote(id, data) {
        const notes = getNotes();
        const idx = notes.findIndex(n => n.id === id);
        if (idx === -1) return false;
        notes[idx] = { ...notes[idx], ...data, updatedAt: new Date().toISOString() };
        saveNotes(notes);
        syncToServer();
        return true;
    }

    function deleteNoteById(id) {
        let notes = getNotes();
        notes = notes.filter(n => n.id !== id);
        saveNotes(notes);
        syncToServer();
    }

    function getNoteById(id) {
        return getNotes().find(n => n.id === id) || null;
    }

    // --- Sync (assíncrono) ---

    async function syncFromServer() {
        if (!isOnline()) return;
        try {
            const data = await fetchFromSupabase();
            if (data && data.length > 0) {
                const mapped = data.map(n => ({
                    id: n.id,
                    title: n.title || '',
                    content: n.content || '',
                    createdAt: n.created_at,
                    updatedAt: n.updated_at,
                }));
                saveNotes(mapped);
            }
        } catch (e) {
            console.warn('Sync from server failed:', e);
        }
    }

    async function syncToServer() {
        if (!isOnline()) return;
        try {
            const notes = getNotes();
            await saveToSupabase(notes, getUserId());
        } catch (e) {
            console.warn('Sync to server failed:', e);
        }
    }

    // Inicia sync automático
    function init() {
        setTimeout(() => syncFromServer(), 1000);
        // Sync a cada 30s se logado
        setInterval(() => {
            if (isOnline()) syncToServer();
        }, 30000);
    }

    return {
        getNotes,
        saveNotes,
        createNote,
        updateNote,
        deleteNoteById,
        getNoteById,
        syncFromServer,
        syncToServer,
        init,
    };
})();
