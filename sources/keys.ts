import { createClient } from '@supabase/supabase-js';

export const keys = {
    groq: process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '',
    ollama: process.env.EXPO_PUBLIC_OLLAMA_API_URL ?? '',
    openai: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '',
};

export const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
);
