/* ============================================
   tasks-storage-supabase.js — Tasks via Supabase
   Fallback para localStorage quando offline
   API compatível com tasks-storage.js
   ============================================ */

const TasksStorage = (() => {
    const LOCAL_KEY = 'my_3d_tasks';
    const TABLE = 'tasks';

    function getUserId() {
        const user = Auth.getUser();
        return user?.sub || null;
    }

    function isOnline() {
        return SupabaseClient.isAvailable() && getUserId();
    }

    // --- Supabase ---

    async function fetchFromSupabase() {
        const sb = SupabaseClient.getClient();
        if (!sb || !getUserId()) return null;

        const { data, error } = await sb
            .from(TABLE)
            .select('*')
            .eq('user_id', getUserId())
            .order('updated_at', { ascending: false });

        if (error) {
            console.warn('Supabase fetch tasks error:', error);
            return null;
        }
        return data;
    }

    async function saveToSupabase(tasks, userId) {
        const sb = SupabaseClient.getClient();
        if (!sb) return false;

        const records = tasks.map(t => ({
            id: t.id,
            user_id: userId,
            title: t.title || '',
            urgency: t.urgency || 'medium',
            date: t.date || null,
            time: t.time || null,
            location: t.location || '',
            description: t.description || '',
            done: t.done || false,
            created_at: t.createdAt || t.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }));

        const { error } = await sb.from(TABLE).upsert(records, { onConflict: 'id' });
        if (error) {
            console.warn('Supabase save tasks error:', error);
            return false;
        }
        return true;
    }

    // --- Public API (síncrona) ---

    function getTasks() {
        return Storage.safeGet(LOCAL_KEY, []);
    }

    function saveTasks(tasks) {
        return Storage.safeSet(LOCAL_KEY, tasks);
    }

    function createTask(data = {}) {
        const tasks = getTasks();
        const task = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2),
            title: data.title || '',
            date: data.date || '',
            time: data.time || '',
            location: data.location || '',
            description: data.description || '',
            urgency: data.urgency || 'medium',
            done: data.done || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        tasks.push(task);
        saveTasks(tasks);
        syncToServer();
        return task;
    }

    function updateTask(id, data) {
        const tasks = getTasks();
        const idx = tasks.findIndex(t => t.id === id);
        if (idx === -1) return false;
        tasks[idx] = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() };
        saveTasks(tasks);
        syncToServer();
        return true;
    }

    function deleteTaskById(id) {
        let tasks = getTasks();
        tasks = tasks.filter(t => t.id !== id);
        saveTasks(tasks);
        syncToServer();
    }

    function getTaskById(id) {
        return getTasks().find(t => t.id === id) || null;
    }

    // --- Sync ---

    async function syncFromServer() {
        if (!isOnline()) return;
        try {
            const data = await fetchFromSupabase();
            if (data && data.length > 0) {
                const mapped = data.map(t => ({
                    id: t.id,
                    title: t.title || '',
                    urgency: t.urgency || 'medium',
                    date: t.date || '',
                    time: t.time || '',
                    location: t.location || '',
                    description: t.description || '',
                    done: t.done || false,
                    createdAt: t.created_at,
                    updatedAt: t.updated_at,
                }));
                saveTasks(mapped);
            }
        } catch (e) {
            console.warn('Sync from server failed:', e);
        }
    }

    async function syncToServer() {
        if (!isOnline()) return;
        try {
            const tasks = getTasks();
            await saveToSupabase(tasks, getUserId());
        } catch (e) {
            console.warn('Sync to server failed:', e);
        }
    }

    function init() {
        setTimeout(() => syncFromServer(), 1000);
        setInterval(() => {
            if (isOnline()) syncToServer();
        }, 30000);
    }

    return {
        getTasks,
        saveTasks,
        createTask,
        updateTask,
        deleteTaskById,
        getTaskById,
        syncFromServer,
        syncToServer,
        init,
    };
})();
