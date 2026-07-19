import { toBase64 } from "../utils/base64";

export async function imageDescription(src: Uint8Array): Promise<string> {
    const base64 = toBase64(src);
    const resp = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
    });
    if (!resp.ok) {
        throw new Error('describe proxy failed: ' + resp.status);
    }
    const data = await resp.json();
    if (data && typeof data.description === 'string' && data.description.length > 0) {
        return data.description;
    }
    throw new Error('describe proxy returned empty description');
}

export async function llamaFind(question: string, images: string): Promise<string> {
    const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: images }),
    });
    if (!resp.ok) {
        throw new Error('chat proxy failed: ' + resp.status);
    }
    const data = await resp.json();
    if (data && typeof data.answer === 'string' && data.answer.length > 0) {
        return data.answer;
    }
    throw new Error('chat proxy returned empty answer');
}

export async function openAIFind(question: string, images: string): Promise<string> {
    return llamaFind(question, images);
}