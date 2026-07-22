import * as React from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { rotateImage } from '../modules/imaging';
import { toBase64Image } from '../utils/base64';
import { Agent } from '../agent/Agent';
import { InvalidateSync } from '../utils/invalidateSync';
import { Theme } from './components/theme';

import { supabase } from '../keys';

function usePhotos(device: BluetoothRemoteGATTServer, onRotated: (rotated: Uint8Array) => void) {

    const [photos, setPhotos] = React.useState<Uint8Array[]>([]);
    const [subscribed, setSubscribed] = React.useState<boolean>(false);
    React.useEffect(() => {
        (async () => {

            let previousChunk = -1;
            let buffer: Uint8Array = new Uint8Array(0);
            function onChunk(id: number | null, data: Uint8Array) {

                if (previousChunk === -1) {
                    if (id === null) {
                        return;
                    } else if (id === 0) {
                        previousChunk = 0;
                        buffer = new Uint8Array(0);
                    } else {
                        return;
                    }
                } else {
                    if (id === null) {
                        console.log('Photo received', buffer);
                        rotateImage(buffer, '270').then(async (rotated) => {
                            console.log('Rotated photo', rotated);
                            setPhotos((p) => [...p, rotated]);
                            onRotated(rotated);
                        });
                        previousChunk = -1;
                        return;
                    } else {
                        if (id !== previousChunk + 1) {
                            previousChunk = -1;
                            console.error('Invalid chunk', id, previousChunk);
                            return;
                        }
                        previousChunk = id;
                    }
                }

                buffer = new Uint8Array([...buffer, ...data]);
            }

            const service = await device.getPrimaryService('19B10000-E8F2-537E-4F6C-D104768A1214'.toLowerCase());
            const photoCharacteristic = await service.getCharacteristic('19b10005-e8f2-537e-4f6c-d104768a1214');
            await photoCharacteristic.startNotifications();
            setSubscribed(true);
            photoCharacteristic.addEventListener('characteristicvaluechanged', (e) => {
                let value = (e.target as BluetoothRemoteGATTCharacteristic).value!;
                let array = new Uint8Array(value.buffer);
                if (array[0] == 0xff && array[1] == 0xff) {
                    onChunk(null, new Uint8Array());
                } else {
                    let packetId = array[0] + (array[1] << 8);
                    let packet = array.slice(2);
                    onChunk(packetId, packet);
                }
            });
            const photoControlCharacteristic = await service.getCharacteristic('19b10006-e8f2-537e-4f6c-d104768a1214');
            await photoControlCharacteristic.writeValue(new Uint8Array([0x05]));
        })();
    }, []);

    return [subscribed, photos] as const;
}

export const DeviceView = React.memo((props: { device: BluetoothRemoteGATTServer }) => {
    const lastPhotoId = React.useRef<string | null>(null);

    const onRotated = React.useCallback(async (rotated: Uint8Array) => {
        try {
            const path = `photos/${Date.now()}.jpg`;
            const blob = new Blob([rotated], { type: 'image/jpeg' });
            const { error: upErr } = await supabase.storage.from('photos').upload(path, blob);
            if (upErr) { console.error(upErr); return; }
            const { data, error: insErr } = await supabase.from('photos').insert({ storage_path: path }).select().single();
            if (insErr) { console.error(insErr); return; }
            lastPhotoId.current = data?.id ?? null;
        } catch (e) { console.error(e); }
    }, []);

    const [subscribed, photos] = usePhotos(props.device, onRotated);
    const agent = React.useMemo(() => {
        const a = new Agent();
        a.onPhotoProcessed = async (_photo, description) => {
            if (lastPhotoId.current) {
                try {
                    await supabase.from('photos').update({ caption: description }).eq('id', lastPhotoId.current);
                } catch (e) { console.error(e); }
            }
        };
        return a;
    }, []);
    const agentState = agent.use();

    const processedPhotos = React.useRef<Uint8Array[]>([]);
    const sync = React.useMemo(() => {
        let processed = 0;
        return new InvalidateSync(async () => {
            if (processedPhotos.current.length > processed) {
                let unprocessed = processedPhotos.current.slice(processed);
                processed = processedPhotos.current.length;
                await agent.addPhoto(unprocessed);
            }
        });
    }, []);
    React.useEffect(() => {
        processedPhotos.current = photos;
        sync.invalidate();
    }, [photos]);

    return (
        <View style={{ flex: 1, flexDirection: 'column', paddingHorizontal: 20, gap: 12, paddingTop: 12 }}>
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
                        {subscribed ? 'Connected — capturing every 5s' : 'Connecting...'}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Text style={{ color: Theme.textMuted, fontFamily: Theme.fontMono, fontSize: 12 }}>
                        <Text style={{ color: Theme.accent }}>{photos.length}</Text> photos
                    </Text>
                    <Text style={{ color: Theme.textMuted, fontFamily: Theme.fontMono, fontSize: 12 }}>
                        <Text style={{ color: Theme.textSoft }}>{processedPhotos.current.length}</Text> described
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
            {agentState.lastDescription && !agentState.answer && (
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
                    readOnly={agentState.loading || photos.length === 0}
                    onSubmitEditing={async (e) => {
                        const question = e.nativeEvent.text;
                        // clear handled by React
                        await agent.answer(question);
                        const state = agent.getState();
                        if (lastPhotoId.current && state?.answer) {
                            await supabase.from('chats').insert({
                                photo_id: lastPhotoId.current,
                                question,
                                answer: state.answer,
                            }).then(null, console.error);
                        }
                    }}
                />
            </View>
            {/* Connect footnote */}
            {!subscribed && (
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