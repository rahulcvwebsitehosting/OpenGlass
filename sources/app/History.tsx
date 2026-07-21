import * as React from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../keys';
import { Theme } from './components/theme';
import { RoundButton } from './components/RoundButton';

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
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
            {/* ---- Header ---- */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                }}
            >
                <View>
                    <Text
                        style={{
                            color: Theme.accent,
                            fontSize: 11,
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                        }}
                    >
                        Gallery
                    </Text>
                    <Text
                        style={{
                            color: Theme.text,
                            fontSize: 24,
                            fontWeight: '800',
                            letterSpacing: -0.3,
                            marginTop: 2,
                        }}
                    >
                        Your Captures
                    </Text>
                </View>
                <RoundButton
                    title={loading ? 'Loading...' : 'Refresh'}
                    size="sm"
                    variant="outline"
                    onPress={refresh}
                    disabled={loading}
                />
            </View>

            {/* ---- Error ---- */}
            {error && (
                <View
                    style={{
                        backgroundColor: Theme.surfaceAlt,
                        borderRadius: Theme.radiusMd,
                        borderWidth: 1,
                        borderColor: Theme.error,
                        padding: 12,
                        marginBottom: 12,
                    }}
                >
                    <Text style={{ color: Theme.error, fontSize: 13 }}>{error}</Text>
                </View>
            )}

            {/* ---- Loading ---- */}
            {loading && photos.length === 0 && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                    <ActivityIndicator size="large" color={Theme.accent} />
                    <Text style={{ color: Theme.textSoft, fontSize: 14 }}>Loading gallery...</Text>
                </View>
            )}

            {/* ---- Empty ---- */}
            {!loading && !error && photos.length === 0 && (
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <Text style={{ color: Theme.textMuted, fontSize: 16 }}>
                        No photos captured yet.
                    </Text>
                    <Text style={{ color: Theme.textMuted, fontSize: 13, opacity: 0.6 }}>
                        Connect your glasses and start capturing to see them here.
                    </Text>
                </View>
            )}

            {/* ---- Photo grid ---- */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 16, paddingBottom: 32 }}>
                    {photos.map((p, idx) => {
                        const url = supabase.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl;
                        const chats = Array.isArray(p.chats) ? p.chats : [];
                        const tilt = idx % 2 === 0;
                        return (
                            <View
                                key={p.id}
                                style={{
                                    backgroundColor: Theme.surfaceAlt,
                                    borderRadius: Theme.radiusXl,
                                    borderWidth: 2,
                                    borderColor: Theme.border,
                                    padding: 14,
                                    ...Theme.shadowCard,
                                    // Slight tilt alternating
                                    transform: tilt ? [{ rotate: '-0.6deg' }] : [{ rotate: '0.6deg' }],
                                }}
                            >
                                {/* Image */}
                                <Image
                                    source={{ uri: url }}
                                    style={{
                                        width: '100%',
                                        height: 220,
                                        borderRadius: Theme.radiusMd,
                                        borderWidth: 2,
                                        borderColor: Theme.borderBright,
                                        marginBottom: 10,
                                    }}
                                    resizeMode="cover"
                                />

                                {/* Meta row */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                    }}
                                >
                                    <Text style={{ color: Theme.textMuted, fontSize: 12 }}>
                                        {p.captured_at ? new Date(p.captured_at).toLocaleString() : ''}
                                    </Text>
                                    <View
                                        style={{
                                            backgroundColor: Theme.surface,
                                            borderRadius: Theme.radiusPill,
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            borderWidth: 1,
                                            borderColor: Theme.accent,
                                        }}
                                    >
                                        <Text style={{ color: Theme.accent, fontSize: 11, fontWeight: '700' }}>
                                            {chats.length > 0 ? `${chats.length} Q&A` : 'No questions'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Caption */}
                                <Text
                                    style={{
                                        color: Theme.text,
                                        fontSize: 15,
                                        lineHeight: 22,
                                        marginBottom: chats.length > 0 ? 10 : 0,
                                    }}
                                >
                                    {p.caption ?? 'Processing...'}
                                </Text>

                                {/* Chats */}
                                {chats.length > 0 && (
                                    <View
                                        style={{
                                            borderTopWidth: 1,
                                            borderTopColor: Theme.borderBright,
                                            paddingTop: 10,
                                            gap: 8,
                                        }}
                                    >
                                        {chats.map((c, i) => (
                                            <View key={i} style={{ flexDirection: 'column', gap: 2 }}>
                                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                                    <Text style={{ color: Theme.accent, fontSize: 12, fontWeight: '700' }}>
                                                        Q:
                                                    </Text>
                                                    <Text style={{ color: Theme.textSoft, fontSize: 13, flex: 1 }}>
                                                        {c.question ?? ''}
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                                    <Text style={{ color: Theme.accentRight, fontSize: 12, fontWeight: '700' }}>
                                                        A:
                                                    </Text>
                                                    <Text style={{ color: Theme.text, fontSize: 13, flex: 1 }}>
                                                        {c.answer ?? ''}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
});