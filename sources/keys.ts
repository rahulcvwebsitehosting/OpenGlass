import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cast process.env so we can access EXPO_PUBLIC_* vars without TS complaints.
const env = process.env as Record<string, string | undefined>;

export const keys = {
    groq: env.EXPO_PUBLIC_GROQ_API_KEY ?? '',
    ollama: env.EXPO_PUBLIC_OLLAMA_API_URL ?? '',
    openai: env.EXPO_PUBLIC_OPENAI_API_KEY ?? '',
};

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
    if (_supabase) return _supabase;
    const url = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    if (!url || !key) {
        console.error(
            'Supabase not configured — EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set at build time.',
        );
        _supabase = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
        return _supabase;
    }
    _supabase = createClient(url, key);
    return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop: string | symbol) {
        const client = getSupabase();
        return Reflect.get(client, prop, client);
    },
});