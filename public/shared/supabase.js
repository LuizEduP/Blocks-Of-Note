/* ============================================
   supabase.js — Supabase Client para o frontend
   ============================================ */

const SUPABASE_URL = 'https://pnlucbugvswehculgziu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Wu4AnwQFfGa5tf5Hh4I2LQ_gPhWosuf';

const SupabaseClient = (() => {
    let _client = null;

    function getClient() {
        if (_client) return _client;
        if (typeof supabase === 'undefined') {
            console.error('Supabase JS SDK não carregado');
            return null;
        }
        _client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                storageKey: 'commentarium_supabase_auth',
            },
        });
        return _client;
    }

    function isAvailable() {
        return typeof supabase !== 'undefined';
    }

    return { getClient, isAvailable };
})();
