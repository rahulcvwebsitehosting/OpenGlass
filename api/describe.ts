import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const env = process.env as Record<string, string | undefined>;
    const apiKey = env.VISION_API_KEY;
    const baseURL = env.VISION_BASE_URL;
    const model = env.VISION_MODEL || 'llama-3.2-11b-vision-preview';

    if (!apiKey) {
        res.status(500).json({ error: 'VISION_API_KEY not configured on server' });
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

    const client = new OpenAI({ apiKey, baseURL });

    try {
        const response = await client.chat.completions.create({
            model,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Describe this image concisely.' },
                        { type: 'image_url', image_url: { url: dataUrl } },
                    ],
                },
            ],
            temperature: 0.4,
            max_tokens: 512,
        });

        const description: string = response.choices[0]?.message?.content ?? '';
        res.status(200).json({ description });
    } catch (err: any) {
        console.error('describe error:', err);
        res.status(500).json({ error: 'Internal error', detail: err?.message });
    }
}