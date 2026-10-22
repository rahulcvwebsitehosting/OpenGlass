import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const env = process.env as Record<string, string | undefined>;
    const apiKey = env.VISION_API_KEY;
    const baseURL = env.VISION_BASE_URL;
    const model = env.VISION_MODEL;

    if (!apiKey || !baseURL || !model) {
        res.status(500).json({ error: 'VISION_API_KEY, VISION_BASE_URL and VISION_MODEL must be configured on the server' });
        return;
    }

    const { image } = req.body ?? {};
    if (!image || typeof image !== 'string') {
        res.status(400).json({ error: 'Missing "image" (base64 string) in body' });
        return;
    }

    const base64 = image.replace(/^data:image\/jpeg;base64,/, '');
    if (base64.length > 2800000) { res.status(413).json({ error: 'Image is too large.' }); return; }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
        res.status(400).json({ error: 'Image must be a base64 JPEG.' }); return;
    }
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) {
        res.status(400).json({ error: 'Image is not a complete JPEG.' }); return;
    }
    const dataUrl = 'data:image/jpeg;base64,' + base64;

    try {
        const client = new OpenAI({ apiKey, baseURL, timeout: 30000, maxRetries: 0 });
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

        const description = response.choices[0]?.message?.content?.trim();
        if (!description) { res.status(502).json({ error: 'AI provider returned an empty description.' }); return; }
        res.status(200).json({ description });
    } catch (err: any) {
        console.error('describe error:', err);
        res.status(502).json({ error: 'AI provider request failed. Check the server model and credentials, then retry.' });
    }
}