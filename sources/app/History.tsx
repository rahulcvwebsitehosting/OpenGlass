import * as React from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../keys';

type ChatRow = {
    question: string | null;
    answer: string | null;
};

type PhotoRow = {
    id: string;
    storage_path: string;
    caption: string | null;
    captured_at: string;
    chats: ChatRow[];
};

export const History = React.memo(() => {
    const [photos, setPhotos] = React.useState<PhotoRow[]>([]);
    const [loading, setLoading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const refresh = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('photos')
                .select('id, storage_path, caption, captured_at, chats(question, answer)')
                .order('captured_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            setPhotos((data ?? []) as unknown as PhotoRow[]);
        } catch (e: any) {
            console.error('History fetch error:', e);
            setError(e?.message ?? 'Failed to load history');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>History</Text>
                <TouchableOpacity
                    onPress={refresh}
                    style={{ backgroundColor: 'rgb(48 48 48)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }}
                    disabled={loading}
                >
                    <Text style={{ color: 'white', fontSize: 16 }}>{loading ? 'Refreshing...' : 'Refresh'}</Text>
                </TouchableOpacity>
            </View>

            {error && (
                <Text style={{ color: '#ff8080', marginBottom: 8 }}>{error}</Text>
            )}

            {loading && photos.length === 0 && (
                <ActivityIndicator size="large" color="white" />
            )}

            {!loading && !error && photos.length === 0 && (
                <Text style={{ color: '#888' }}>No photos captured yet.</Text>
            )}

            <ScrollView style={{ flex: 1 }}>
                {photos.map((p) => {
                    const url = supabase.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl;
                    const chats = Array.isArray(p.chats) ? p.chats : [];
                    return (
                        <View key={p.id} style={{ marginBottom: 16, backgroundColor: 'rgb(28 28 28)', borderRadius: 16, padding: 12 }}>
                            <Image
                                source={{ uri: url }}
                                style={{ width: '100%', height: 220, borderRadius: 12, marginBottom: 8 }}
                                resizeMode="cover"
                            />
                            <Text style={{ color: 'white', fontSize: 16, opacity: 0.7, marginBottom: 4 }}>
                                {p.captured_at ? new Date(p.captured_at).toLocaleString() : ''}
                            </Text>
                            <Text style={{ color: 'white', fontSize: 16, marginBottom: 8 }}>
                                {p.caption ?? 'No caption'}
                            </Text>
                            {chats.length > 0 && (
                                <View style={{ marginTop: 4, borderTopColor: 'rgb(48 48 48)', borderTopWidth: 1, paddingTop: 8 }}>
                                    {chats.map((c, i) => (
                                        <View key={i} style={{ marginBottom: 6 }}>
                            <Text style={{ color: '#9ad', fontSize: 14 }}>Q: {c.question ?? ''}</Text>
                                            <Text style={{ color: '#df9', fontSize: 14 }}>A: {c.answer ?? ''}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
});
