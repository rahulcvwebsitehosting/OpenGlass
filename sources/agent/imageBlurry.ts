import { toBase64 } from "../utils/base64";

export async function imageBlurry(src: Uint8Array): Promise<string> {
    const base64 = toBase64(src);
    const resp = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
    });
    if (!resp.ok) {
        console.warn('describe proxy failed for blur check:', resp.status);
        return 'NO';
    }
    const data = await resp.json();
    return (data && typeof data.description === 'string' && data.description.length > 0) ? 'NO' : 'YES';
}