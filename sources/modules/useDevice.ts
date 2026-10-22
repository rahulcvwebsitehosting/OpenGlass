import * as React from 'react';
import { SERVICE_UUID } from './photoProtocol';

export function useDevice() {
    const deviceRef = React.useRef<BluetoothRemoteGATTServer | null>(null);
    const cleanupRef = React.useRef<() => void>(() => {});
    const mounted = React.useRef(true);
    const connecting = React.useRef(false);
    const [device, setDevice] = React.useState<BluetoothRemoteGATTServer | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    React.useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; cleanupRef.current(); deviceRef.current?.disconnect(); };
    }, []);
    const doConnect = React.useCallback(async () => {
        if (connecting.current) return;
        connecting.current = true;
        setError(null);
        try {
            if (typeof navigator === 'undefined' || !navigator.bluetooth || !globalThis.isSecureContext) {
                throw new Error('Pairing requires Chrome or Edge with Bluetooth enabled, over HTTPS or localhost. Native mobile apps and iOS are not supported.');
            }
            const selected = await navigator.bluetooth.requestDevice({
                filters: [{ name: 'OpenGlass' }], optionalServices: [SERVICE_UUID],
            });
            if (!selected.gatt) throw new Error('This device does not provide a Bluetooth GATT server.');
            cleanupRef.current();
            deviceRef.current?.disconnect();
            const disconnected = () => {
                deviceRef.current = null;
                if (mounted.current) { setDevice(null); setError('Glasses disconnected. Pair again to resume capturing.'); }
            };
            selected.addEventListener('gattserverdisconnected', disconnected);
            cleanupRef.current = () => selected.removeEventListener('gattserverdisconnected', disconnected);
            const gatt = await selected.gatt.connect();
            if (!mounted.current) { cleanupRef.current(); gatt.disconnect(); return; }
            deviceRef.current = gatt;
            setDevice(gatt);
        } catch (e) {
            cleanupRef.current();
            if (mounted.current && (e as Error).name !== 'NotFoundError') setError((e as Error).message || 'Could not connect to glasses.');
        } finally { connecting.current = false; }
    }, []);
    return [device, doConnect, error] as const;
}
