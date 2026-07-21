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
        <SafeAreaView style={styles.container}>
            {/* ---- Header ---- */}
            <View style={styles.header}>
                <View style={styles.brand}>
                    <View style={styles.logo}>
                        <Text style={styles.logoText}>OG</Text>
                    </View>
                    <View>
                        <Text style={styles.brandName}>OpenGlass</Text>
                        <Text style={styles.brandTag}>AI Vision Companion</Text>
                    </View>
                </View>

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
                        <Text style={styles.connectTitle}>Connect your glasses</Text>
                        <Text style={styles.connectSubtitle}>
                            Pair your XIAO ESP32S3 Sense board via Bluetooth to start seeing the world through AI.
                        </Text>
                        <RoundButton
                            title="Connect Device"
                            action={connectDevice}
                            size="lg"
                            variant="primary"
                        />
                    </View>
                )}

                {view === 'live' && device && <DeviceView device={device} />}
                {view === 'history' && <History />}
            </View>
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
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
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: Theme.border,
        backgroundColor: Theme.surface,
    },
    brand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: Theme.radiusMd,
        backgroundColor: Theme.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Theme.accent,
        ...Theme.shadowHard,
    },
    logoText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    brandName: {
        color: Theme.text,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    brandTag: {
        color: Theme.accent,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },

    /* ---- Tabs ---- */
    tabs: {
        flexDirection: 'row',
        backgroundColor: Theme.surfaceAlt,
        borderRadius: Theme.radiusPill,
        padding: 3,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: Theme.radiusPill,
    },
    tabActive: {
        backgroundColor: Theme.accent,
        ...Theme.shadowHard,
    },
    tabText: {
        color: Theme.textSoft,
        fontSize: 14,
        fontWeight: '700',
    },
    tabTextActive: {
        color: '#ffffff',
    },

    /* ---- Connect screen ---- */
    connectScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 16,
    },
    connectTitle: {
        color: Theme.text,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    connectSubtitle: {
        color: Theme.textSoft,
        fontSize: 15,
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 460,
        marginBottom: 8,
    },
});