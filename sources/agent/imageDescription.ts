import { KnownModel, ollamaInference } from "../modules/ollama";
import { toBase64 } from "../utils/base64";


export async function imageDescription(src: Uint8Array, model: KnownModel = 'moondream:1.8b-v2-fp16'): Promise<string> {
    // Serverless proxy path. On Vercel this hits api/describe.ts which uses
    // a server-side Groq vision model key. In local dev (no /api route), fall
    // back to Ollama so the app still works.
    try {
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
    } catch (err) {
        console.warn('/api/describe unavailable, falling back to Ollama:', err);
        return ollamaInference({
            model: model,
            messages: [{
                role: 'system',
                content: 'You are a very advanced model and your task is to describe the image as precisely as possible. Transcribe any text you see.'
            }, {
                role: 'user',
                content: 'Describe the scene',
                images: [src],
            }]
        });
    }
}

export async function llamaFind(question: string, images: string): Promise<string> {
    try {
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
    } catch (err) {
        console.warn('/api/chat unavailable, falling back to null:', err);
        return '';
    }
}

export async function openAIFind(question: string, images: string): Promise<string> {
    // Kept for API parity; redirects to the same /api/chat proxy.
    return llamaFind(question, images);
}
