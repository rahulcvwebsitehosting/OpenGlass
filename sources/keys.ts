import { createClient } from '@supabase/supabase-js';

const env = process.env as Record<string, string | undefined>;

export const supabase = createClient(
    env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
);