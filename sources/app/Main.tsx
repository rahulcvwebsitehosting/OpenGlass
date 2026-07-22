import * as React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RoundButton } from './components/RoundButton';
import { Theme } from './components/theme';
import { useDevice } from '../modules/useDevice';
import { DeviceView } from './DeviceView';
import { History } from './History';

export const Main = React.memo(() => {
    const [device, connectDevice] = useDevice();
    const [view, setView] = React.useState<'live' | 'history'>('live');

    return (
        <View style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                {/* ---- Header ---- */}
                <View style={styles.header}>
                    {/* Brand */}
                    <TouchableOpacity onPress={() => setView('live')} activeOpacity={0.7}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={styles.logo}>
                                <Text style={styles.logoText}>OG</Text>
                            </View>
                            <View>
                                <Text style={styles.brandName}>OpenGlass</Text>
                                <Text style={styles.eyebrow}>AI · Vision · Companion</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Tabs — pill-style, pencil-border, paper-textured */}
                    <View style={styles.tabs}>
                        <TouchableOpacity
                            onPress={() => setView('live')}
                            style={[styles.tab, view === 'live' && styles.tabActive]}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabText, view === 'live' && styles.tabTextActive]}>
                                Live
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setView('history')}
                            style={[styles.tab, view === 'history' && styles.tabActive]}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabText, view === 'history' && styles.tabTextActive]}>
                                History
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ---- Body ---- */}
                <View style={{ flex: 1 }}>
                    {view === 'live' && !device && (
                        <View style={styles.connectScreen}>
                            <View style={{ alignItems: 'center', gap: 8 }}>
                                <Text style={styles.eyebrow}>Smart Glasses · Reimagined</Text>
                                <Text style={styles.connectTitle}>See the world through AI eyes</Text>
                                <Text style={styles.connectSubtitle}>
                                    Pair your XIAO ESP32S3 Sense board via Bluetooth. Photos are captured every 5
                                    seconds, described by a vision LLM, and stored for you to search and ask
                                    questions about anything you see.
                                </Text>
                            </View>
                            <RoundButton
                                title="Pair Device"
                                action={connectDevice}
                                size="lg"
                                variant="marker"
                            />
<Text style={styles.connectNote}>
                        Requires desktop Chrome/Edge. iOS not supported.
                    </Text>
                        </View>
                    )}

                    {view === 'live' && device && <DeviceView device={device} />}
                    {view === 'history' && <History />}
                </View>
            </SafeAreaView>
        </View>
    );
});

const styles = StyleSheet.create({
    /* ---- Layout ---- */
    container: {
        flex: 1,
        backgroundColor: Theme.background,
        alignItems: 'stretch',
    },

    /* ---- Header ---- */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 2,
        borderBottomColor: Theme.border,
        backgroundColor: Theme.surface,
        boxShadow: `3px 3px 0 0 ${Theme.border}`,
    },
    logo: {
        width: 42,
        height: 42,
        borderRadius: Theme.radiusSm,
        backgroundColor: Theme.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Theme.border,
        boxShadow: `3px 3px 0 0 ${Theme.border}`,
    },
    logoText: {
        color: '#ffffff',
        fontSize: 17,
        fontFamily: Theme.fontDisplay,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    brandName: {
        color: Theme.text,
        fontSize: 18,
        fontFamily: Theme.fontDisplay,
        fontWeight: '700',
        letterSpacing: -0.3,
    },

    /* ---- Eyebrow label (LooksMax style) ---- */
    eyebrow: {
        fontFamily: Theme.fontDisplay,
        fontSize: 12,
        letterSpacing: 1.2,
        color: Theme.accent,
        textTransform: 'uppercase',
        fontWeight: '700',
    },

    /* ---- Tabs ---- */
    tabs: {
        flexDirection: 'row',
        backgroundColor: Theme.surfaceAged,
        borderRadius: Theme.radiusPill,
        borderWidth: 2,
        borderColor: Theme.border,
        padding: 3,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: Theme.radiusPill,
    },
    tabActive: {
        backgroundColor: Theme.accent,
        boxShadow: `3px 3px 0 0 ${Theme.border}`,
    },
    tabText: {
        color: Theme.textSoft,
        fontSize: 14,
        fontFamily: Theme.fontDisplay,
        fontWeight: '700',
    },
    tabTextActive: {
        color: '#ffffff',
    },

    /* ---- Connect screen (hero layout, LooksMax inspired) ---- */
    connectScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 20,
    },
    connectTitle: {
        color: Theme.text,
        fontSize: 32,
        fontFamily: Theme.fontDisplay,
        fontWeight: '700',
        letterSpacing: -0.5,
        lineHeight: 36,
    },
    connectSubtitle: {
        color: Theme.textSoft,
        fontSize: 16,
        fontFamily: Theme.fontBody,
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 520,
    },
    connectNote: {
        color: Theme.textMuted,
        fontSize: 12,
        fontFamily: Theme.fontBody,
        textAlign: 'center',
        marginTop: 4,
    },
});