import type { VercelRequest, VercelResponse } from '@vercel/node';

// Serverless proxy: receives { image: base64string } and calls Groq's
// vision chat-completions endpoint using a server-side API key.
// The Groq key NEVER ships to the browser.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
        res.status(500).json({ error: 'GROQ_API_KEY not configured on server' });
        return;
    }

    const { image } = req.body ?? {};
    if (!image || typeof image !== 'string') {
        res.status(400).json({ error: 'Missing "image" (base64 string) in body' });
        return;
    }

    const dataUrl = image.startsWith('data:')
        ? image
        : `data:image/jpeg;base64,${image}`;

    const payload = {
        model: VISION_MODEL,
        messages: [
            {
                role: 'system',
                content:
                    'You are a very advanced model and your task is to describe the image as precisely as possible. Transcribe any text you see.',
            },
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Describe the scene' },
                    { type: 'image_url', image_url: { url: dataUrl } },
                ],
            },
        ],
        temperature: 0.4,
        max_tokens: 512,
    };

    try {
        const resp = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            res.status(502).json({ error: 'Groq error', detail: errText, status: resp.status });
            return;
        }

        const data: any = await resp.json();
        const description: string = data?.choices?.[0]?.message?.content ?? '';
        res.status(200).json({ description });
    } catch (err: any) {
        console.error('describe error:', err);
        res.status(500).json({ error: 'Internal error', detail: err?.message });
    }
}
