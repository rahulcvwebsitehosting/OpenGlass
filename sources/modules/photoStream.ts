import { CONTROL_UUID, PHOTO_UUID, SERVICE_UUID, PhotoAssembler } from './photoProtocol';

export function subscribePhotos(
    device: BluetoothRemoteGATTServer,
    onPhoto: (photo: Uint8Array) => void,
    onReady: () => void,
    onError: (error: unknown) => void,
) {
    let cancelled = false;
    let characteristic: BluetoothRemoteGATTCharacteristic | undefined;
    let control: BluetoothRemoteGATTCharacteristic | undefined;
    let cleanup: Promise<void> | undefined;
    const assembler = new PhotoAssembler();
    const listener = (event: Event) => {
        if (cancelled) return;
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
        if (!value) return;
        const photo = assembler.push(value);
        if (photo) onPhoto(photo);
    };
    const release = () => cleanup ??= (async () => {
        assembler.reset();
        characteristic?.removeEventListener('characteristicvaluechanged', listener);
        if (!device.connected) return;
        try { await control?.writeValue(new Uint8Array([0])); } catch {}
        try { await characteristic?.stopNotifications(); } catch {}
    })();
    const ready = (async () => {
        try {
            const service = await device.getPrimaryService(SERVICE_UUID);
            if (cancelled) return;
            characteristic = await service.getCharacteristic(PHOTO_UUID);
            if (cancelled) return;
            characteristic.addEventListener('characteristicvaluechanged', listener);
            await characteristic.startNotifications();
            if (cancelled) return;
            control = await service.getCharacteristic(CONTROL_UUID);
            if (cancelled) return;
            await control.writeValue(new Uint8Array([5]));
            if (!cancelled) onReady();
        } catch (error) {
            // A failed control lookup/write must not leave a live subscription.
            const report = !cancelled;
            cancelled = true;
            await release();
            if (report) onError(error);
        }
    })();
    return () => {
        cancelled = true;
        assembler.reset();
        characteristic?.removeEventListener('characteristicvaluechanged', listener);
        // Wait for setup to settle so a late start cannot undo cleanup.
        return ready.then(release);
    };
}
