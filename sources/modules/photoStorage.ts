import type { SupabaseClient } from '@supabase/supabase-js';

export async function savePhoto(client: SupabaseClient, photo: Uint8Array): Promise<string> {
    const path = 'photos/' + crypto.randomUUID() + '.jpg';
    const { error: uploadError } = await client.storage.from('photos').upload(path, new Blob([photo], { type: 'image/jpeg' }));
    if (uploadError) throw uploadError;
    const { data, error } = await client.from('photos').insert({ storage_path: path }).select('id').single();
    if (error || !data?.id) {
        await client.storage.from('photos').remove([path]);
        throw error ?? new Error('Photo record was not created.');
    }
    return data.id;
}

export async function saveCaption(client: SupabaseClient, photoId: Promise<string | null>, caption: string) {
    const id = await photoId;
    if (!id) return;
    const { error } = await client.from('photos').update({ caption }).eq('id', id);
    if (error) throw error;
}
