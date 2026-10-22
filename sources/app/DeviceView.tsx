import * as React from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { rotateImage } from '../modules/imaging';
import { toBase64Image } from '../utils/base64';
import { Agent } from '../agent/Agent';
import { subscribePhotos } from '../modules/photoStream';
import { savePhoto, saveCaption } from '../modules/photoStorage';
import { Theme } from './components/theme';

import { supabase, storageConfigured } from '../keys';

export const DeviceView = React.memo((props: { device: BluetoothRemoteGATTServer }) => {
    const [photos, setPhotos] = React.useState<Uint8Array[]>([]);
    const [captured, setCaptured] = React.useState(0);
    const [subscribed, setSubscribed] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [question, setQuestion] = React.useState('');
    const photoIds = React.useRef(new WeakMap<Uint8Array, Promise<string | null>>());
    const lastPhotoId = React.useRef<Promise<string | null>>(Promise.resolve(null));
    const agent = React.useMemo(() => {
        const a = new Agent();
        a.onPhotoProcessed = async (photo, description) => {
            const photoId = photoIds.current.get(photo) ?? Promise.resolve(null);
            lastPhotoId.current = photoId;
            if (storageConfigured) await saveCaption(supabase, photoId, description);
        };
        return a;
    }, []);
    const agentState = agent.use();

    React.useEffect(() => {
        let active = true;
        let processing = false;
        const queue: Uint8Array[] = [];
        const report = (e: unknown) => { if (active) setError((e as Error).message || 'Capture failed. Reconnect to try again.'); };
        const drain = async () => {
            if (processing) return;
            processing = true;
            try {
                while (active && queue.length) {
                    const raw = queue.shift()!;
                    try {
                        const photo = await rotateImage(raw, '270');
                        if (!active) break;
                        setPhotos(p => [...p.slice(-11), photo]);
                        setCaptured(n => n + 1);
                        const id = storageConfigured
                            ? savePhoto(supabase, photo).catch(e => { report(e); return null; })
                            : Promise.resolve(null);
                        photoIds.current.set(photo, id);
                        await agent.addPhoto([photo]);
                    } catch (e) { report(e); }
                }
            } finally { processing = false; }
        };
        setSubscribed(false);
        const stop = subscribePhotos(props.device, photo => {
            if (queue.length >= 8) {
                queue.shift();
                setError('Processing is slower than capture. Some queued frames were skipped to keep the live view current.');
            }
            queue.push(photo);
            void drain();
        }, () => { if (active) setSubscribed(true); }, report);
        return () => { active = false; queue.length = 0; void stop(); };
    }, [props.device, agent]);

    return (
        <View style={{ flex: 1, flexDirection: 'column', paddingHorizontal: 20, gap: 12, paddingTop: 12 }}>
            {(!storageConfigured || error || agentState.error) && (
                <Text accessibilityRole="alert" style={{ color: Theme.error, fontFamily: Theme.fontBody }}>
                    {error || agentState.error || 'History storage is not configured. Live descriptions and questions still work.'}
                </Text>
            )}
            {/* ---- Status bar — pencil-border card, subtle tilt ---- */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: Theme.surface,
                    borderRadius: Theme.radiusSm,
                    padding: 14,
                    borderWidth: 2,
                    borderColor: Theme.border,
                    boxShadow: `3px 3px 0 0 ${Theme.border}`,
                    transform: [{ rotate: '-0.4deg' }],
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: subscribed ? Theme.success : Theme.warning,
                            borderWidth: 1.5,
                            borderColor: Theme.border,
                        }}
                    />
                    <Text style={{ color: Theme.text, fontSize: 13, fontFamily: Theme.fontBody, fontWeight: '600' }}>
                        {subscribed ? 'Connected — capture interval 5s' : 'Connecting...'}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Text style={{ color: Theme.textMuted, fontFamily: Theme.fontMono, fontSize: 12 }}>
                        <Text style={{ color: Theme.accent }}>{captured}</Text> photos
                    </Text>
                    <Text style={{ color: Theme.textMuted, fontFamily: Theme.fontMono, fontSize: 12 }}>
                        <Text style={{ color: Theme.textSoft }}>{agentState.described}</Text> described
                    </Text>
                </View>
            </View>

            {/* ---- Recent captures strip ---- */}
            {photos.length > 0 && (
                <View>
                    <Text style={{
                        fontFamily: Theme.fontDisplay,
                        fontSize: 12,
                        letterSpacing: 1,
                        color: Theme.accent,
                        textTransform: 'uppercase',
                        fontWeight: '700',
                        marginBottom: 8,
                        marginLeft: 2,
                    }}>
                        Recent captures
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {photos.slice(-12).map((photo, index) => (
                                <Image
                                    key={index}
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: Theme.radiusImage,
                                        borderWidth: 2,
                                        borderColor: Theme.border,
                                        boxShadow: `2px 2px 0 0 ${Theme.border}`,
                                    }}
                                    source={{ uri: toBase64Image(photo) }}
                                />
                            ))}
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* ---- Scene description card ---- */}
            {agentState.lastDescription && (
                <View
                    style={{
                        backgroundColor: Theme.surface,
                        borderRadius: Theme.radiusCard,
                        borderWidth: 2,
                        borderColor: Theme.border,
                        borderLeftWidth: 5,
                        borderLeftColor: Theme.accent,
                        padding: 16,
                        boxShadow: `4px 4px 0 0 ${Theme.border}`,
                    }}
                >
                    <Text style={{
                        fontFamily: Theme.fontDisplay,
                        fontSize: 11,
                        letterSpacing: 1,
                        color: Theme.accent,
                        textTransform: 'uppercase',
                        fontWeight: '700',
                        marginBottom: 6,
                    }}>
                        What the AI sees
                    </Text>
                    <Text style={{
                        color: Theme.text,
                        fontSize: 15,
                        lineHeight: 23,
                        fontFamily: Theme.fontBody,
                    }}>
                        {agentState.lastDescription}
                    </Text>
                </View>
            )}

            {/* ---- Answer card — dashed border, marker accent ---- */}
            {agentState.answer && !agentState.loading && (
                <View
                    style={{
                        backgroundColor: Theme.surface,
                        borderRadius: Theme.radiusCard,
                        borderWidth: 2,
                        borderColor: Theme.accent,
                        borderStyle: 'dashed',
                        padding: 16,
                        boxShadow: `4px 4px 0 0 ${Theme.accent}`,
                        transform: [{ rotate: '0.5deg' }],
                    }}
                >
                    <Text style={{
                        fontFamily: Theme.fontDisplay,
                        fontSize: 11,
                        letterSpacing: 1,
                        color: Theme.accent,
                        textTransform: 'uppercase',
                        fontWeight: '700',
                        marginBottom: 8,
                    }}>
                        Answer
                    </Text>
                    <Text style={{
                        color: Theme.text,
                        fontSize: 16,
                        lineHeight: 25,
                        fontFamily: Theme.fontBody,
                    }}>
                        {agentState.answer}
                    </Text>
                </View>
            )}

            {/* ---- Loading ---- */}
            {agentState.loading && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 }}>
                    <ActivityIndicator size="large" color={Theme.accent} />
                    <Text style={{
                        color: Theme.textSoft,
                        fontSize: 15,
                        fontFamily: Theme.fontBody,
                    }}>
                        Analyzing scenes...
                    </Text>
                </View>
            )}

            <View style={{ flex: 1 }} />

            {/* ---- Question input ---- */}
            <View
                style={{
                    backgroundColor: Theme.surface,
                    borderRadius: Theme.radiusCard,
                    borderWidth: 2,
                    borderColor: Theme.border,
                    padding: 12,
                    marginBottom: 20,
                    boxShadow: `3px 3px 0 0 ${Theme.border}`,
                }}
            >
                <TextInput
                    style={{
                        color: Theme.text,
                        fontSize: 16,
                        fontFamily: Theme.fontBody,
                        padding: 10,
                        backgroundColor: Theme.surfaceAged,
                        borderRadius: Theme.radiusInput,
                        borderWidth: 2,
                        borderColor: Theme.border,
                    }}
                    placeholder="Ask about what you're seeing..."
                    placeholderTextColor={Theme.textMuted}
                    value={question}
                    onChangeText={setQuestion}
                    readOnly={agentState.loading || agentState.described === 0}
                    onSubmitEditing={async (e) => {
                        const text = e.nativeEvent.text.trim();
                        const photoId = lastPhotoId.current;
                        const answer = await agent.answer(text);
                        if (!answer) return;
                        setQuestion('');
                        try {
                            const id = await photoId;
                            if (id && storageConfigured) {
                                const { error } = await supabase.from('chats').insert({ photo_id: id, question: text, answer });
                                if (error) throw error;
                            }
                        } catch (e) { setError((e as Error).message || 'Could not save question history.'); }
                    }}
                />
            </View>
            {/* Connect footnote */}
            {!subscribed && !error && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                    <ActivityIndicator size="large" color={Theme.accent} />
                    <Text style={{ color: Theme.textSoft, fontSize: 14, fontFamily: Theme.fontBody }}>
                        Connecting to XIAO ESP32S3...
                    </Text>
                </View>
            )}
        </View>
    );
});