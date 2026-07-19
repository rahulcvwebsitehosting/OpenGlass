import * as React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RoundButton } from './components/RoundButton';
import { Theme } from './components/theme';
import { useDevice } from '../modules/useDevice';
import { DeviceView } from './DeviceView';
import { History } from './History';
import { startAudio } from '../modules/openai';

export const Main = React.memo(() => {

    const [device, connectDevice] = useDevice();
    const [view, setView] = React.useState<'live' | 'history'>('live');

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.tabBar}>
                <TouchableOpacity onPress={() => setView('live')} style={[styles.tab, view === 'live' && styles.tabActive]}>
                    <Text style={[styles.tabText, view === 'live' && styles.tabTextActive]}>Live</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setView('history')} style={[styles.tab, view === 'history' && styles.tabActive]}>
                    <Text style={[styles.tabText, view === 'history' && styles.tabTextActive]}>History</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
                {view === 'live' && (
                    !device ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' }}>
                            <RoundButton title="Connect to the device" action={connectDevice} />
                        </View>
                    ) : (
                        <DeviceView device={device} />
                    )
                )}
                {view === 'history' && (
                    <History />
                )}
            </View>
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.background,
        alignItems: 'stretch',
        justifyContent: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: 'rgb(20 20 20)',
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    tabActive: {
        backgroundColor: 'rgb(48 48 48)',
    },
    tabText: {
        color: '#888',
        fontSize: 16,
        fontWeight: '600',
    },
    tabTextActive: {
        color: 'white',
    },
});
