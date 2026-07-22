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
            console.error(e);
            setError(e?.message ?? 'Failed to load gallery');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { refresh(); }, [refresh]);

    return (
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
            {/* ---- Gallery header — eyebrown + title ---- */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginBottom: 18,
            }}>
                <View>
                    <Text style={{
                        fontFamily: Theme.fontDisplay,
                        fontSize: 12,
                        letterSpacing: 1.2,
                        color: Theme.accent,
                        textTransform: 'uppercase',
                        fontWeight: '700',
                    }}>
                        Gallery
                    </Text>
                    <Text style={{
                        color: Theme.text,
                        fontFamily: Theme.fontDisplay,
                        fontSize: 26,
                        fontWeight: '700',
                        letterSpacing: -0.4,
                        marginTop: 2,
                    }}>
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

            {/* ---- Error alert — dashed marker border ---- */}
            {error && (
                <View style={{
                    backgroundColor: Theme.surface,
                    borderRadius: Theme.radiusSm,
                    borderWidth: 2,
                    borderColor: Theme.error,
                    borderStyle: 'dashed',
                    padding: 12,
                    marginBottom: 12,
                }}>
                    <Text style={{ color: Theme.error, fontSize: 13, fontFamily: Theme.fontBody }}>{error}</Text>
                </View>
            )}

            {/* ---- Loading state ---- */}
            {loading && photos.length === 0 && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                    <ActivityIndicator size="large" color={Theme.accent} />
                    <Text style={{ color: Theme.textSoft, fontFamily: Theme.fontBody, fontSize: 14 }}>
                        Loading gallery...
                    </Text>
                </View>
            )}

            {/* ---- Empty state ---- */}
            {!loading && !error && photos.length === 0 && (
                <View style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <Text style={{ color: Theme.textMuted, fontSize: 16, fontFamily: Theme.fontBody }}>
                        No photos captured yet.
                    </Text>
                    <Text style={{ color: Theme.textMuted, fontSize: 13, fontFamily: Theme.fontBody, opacity: 0.6 }}>
                        Connect your glasses to start seeing captures here.
                    </Text>
                </View>
            )}

            {/* ---- Photo feed ---- */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 18, paddingBottom: 32 }}>
                    {photos.map((p, idx) => {
                        const url = supabase.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl;
                        const chats = Array.isArray(p.chats) ? p.chats : [];
                        const tilt = idx % 2 === 0 ? '-1deg' : '1deg';

                        return (
                            <View key={p.id} style={{
                                backgroundColor: Theme.surface,
                                borderRadius: Theme.radiusCard,
                                borderWidth: 2,
                                borderColor: Theme.border,
                                padding: 16,
                                boxShadow: `4px 4px 0 0 ${Theme.border}`,
                                transform: [{ rotate: tilt }],
                            }}>
                                {/* Photo */}
                                <Image
                                    source={{ uri: url }}
                                    style={{
                                        width: '100%',
                                        height: 240,
                                        borderRadius: Theme.radiusImage,
                                        borderWidth: 2,
                                        borderColor: Theme.border,
                                        marginBottom: 12,
                                        boxShadow: `2px 2px 0 0 ${Theme.border}`,
                                    }}
                                    resizeMode="cover"
                                />

                                {/* Meta row: date + Q&A badge */}
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 10,
                                }}>
                                    <Text style={{
                                        color: Theme.textMuted,
                                        fontFamily: Theme.fontMono,
                                        fontSize: 12,
                                    }}>
                                        {p.captured_at ? new Date(p.captured_at).toLocaleString() : ''}
                                    </Text>
                                    {chats.length > 0 && (
                                        <View style={{
                                            backgroundColor: Theme.postit,
                                            borderRadius: Theme.radiusPill,
                                            borderWidth: 1.5,
                                            borderColor: Theme.text,
                                            paddingHorizontal: 10,
                                            paddingVertical: 3,
                                        }}>
                                            <Text style={{
                                                color: Theme.text,
                                                fontFamily: Theme.fontDisplay,
                                                fontSize: 11,
                                                fontWeight: '700',
                                            }}>
                                                {chats.length} Q&A
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Caption */}
                                <Text style={{
                                    color: Theme.text,
                                    fontFamily: Theme.fontBody,
                                    fontSize: 15,
                                    lineHeight: 23,
                                    marginBottom: chats.length > 0 ? 12 : 0,
                                }}>
                                    {p.caption ?? 'Processing...'}
                                </Text>

                                {/* Q&A pairs — dashed border separator */}
                                {chats.length > 0 && (
                                    <View style={{
                                        borderTopWidth: 2,
                                        borderTopColor: Theme.border,
                                        borderStyle: 'dashed',
                                        paddingTop: 10,
                                        gap: 10,
                                    }}>
                                        {chats.map((c, i) => (
                                            <View key={i} style={{ gap: 4 }}>
                                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                                                    <Text style={{
                                                        color: Theme.accent,
                                                        fontFamily: Theme.fontDisplay,
                                                        fontSize: 12,
                                                        fontWeight: '700',
                                                    }}>
                                                        Q:
                                                    </Text>
                                                    <Text style={{
                                                        color: Theme.text,
                                                        fontFamily: Theme.fontBody,
                                                        fontSize: 14,
                                                        flex: 1,
                                                        lineHeight: 20,
                                                    }}>
                                                        {c.question ?? ''}
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                                                    <Text style={{
                                                        color: Theme.textSoft,
                                                        fontFamily: Theme.fontDisplay,
                                                        fontSize: 12,
                                                        fontWeight: '700',
                                                    }}>
                                                        A:
                                                    </Text>
                                                    <Text style={{
                                                        color: Theme.textSoft,
                                                        fontFamily: Theme.fontBody,
                                                        fontSize: 14,
                                                        flex: 1,
                                                        lineHeight: 20,
                                                    }}>
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