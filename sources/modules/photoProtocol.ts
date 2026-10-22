export const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
export const PHOTO_UUID = '19b10005-e8f2-537e-4f6c-d104768a1214';
export const CONTROL_UUID = '19b10006-e8f2-537e-4f6c-d104768a1214';

// Little-endian sequence number followed by JPEG bytes; 0xffff terminates a frame.
export class PhotoAssembler {
    private chunks: Uint8Array[] = [];
    private next = 0;
    private size = 0;
    constructor(private maxBytes = 2 * 1024 * 1024) {}
    reset() { this.chunks = []; this.next = 0; this.size = 0; }
    push(value: DataView): Uint8Array | null {
        if (value.byteLength < 2) { this.reset(); return null; }
        const id = value.getUint16(0, true);
        if (id === 0xffff) {
            if (!this.size || value.byteLength !== 2) { this.reset(); return null; }
            const frame = new Uint8Array(this.size);
            let offset = 0;
            for (const chunk of this.chunks) { frame.set(chunk, offset); offset += chunk.length; }
            this.reset();
            return frame[0] === 0xff && frame[1] === 0xd8 &&
                frame[frame.length - 2] === 0xff && frame[frame.length - 1] === 0xd9 ? frame : null;
        }
        if (id === 0) this.reset();
        if (id !== this.next || value.byteLength === 2 || this.size + value.byteLength - 2 > this.maxBytes) {
            this.reset(); return null;
        }
        const chunk = new Uint8Array(value.buffer, value.byteOffset + 2, value.byteLength - 2).slice();
        this.chunks.push(chunk);
        this.size += chunk.length;
        this.next++;
        return null;
    }
}
