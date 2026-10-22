import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Expo only inlines direct process.env.EXPO_PUBLIC_* references.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const storageConfigured = Boolean(url && key);
let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
    if (!url || !key) throw new Error('History is unavailable. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then rebuild the app.');
    return client ??= createClient(url, key);
}
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        const instance = getSupabase();
        const value = Reflect.get(instance, prop, instance);
        return typeof value === 'function' ? value.bind(instance) : value;
    },
});
