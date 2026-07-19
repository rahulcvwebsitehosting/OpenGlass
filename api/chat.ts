import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const env = process.env as Record<string, string | undefined>;
    const apiKey = env.CHAT_API_KEY;
    const baseURL = env.CHAT_BASE_URL;
    const model = env.CHAT_MODEL || 'meta/llama-3.2-90b-vision-instruct';

    if (!apiKey) {
        res.status(500).json({ error: 'CHAT_API_KEY not configured on server' });
        return;
    }

    const { question, context } = req.body ?? {};
    if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Missing "question" in body' });
        return;
    }
    const ctx = typeof context === 'string' ? context : '';

    const systemPrompt = `
You are a smart glasses assistant. Based on the following image descriptions, answer the user's question. Context: ${ctx}

DO NOT mention the images, scenes or descriptions in your answer, just answer the question.
DO NOT try to generalize or provide possible scenarios.
ONLY use the information in the description of the images to answer the question.
BE concise and specific.
`;

    const client = new OpenAI({ apiKey, baseURL });

    try {
        const response = await client.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: question },
            ],
        });
        const answer: string = response.choices[0]?.message?.content ?? '';
        res.status(200).json({ answer });
    } catch (err: any) {
        console.error('chat error:', err);
        res.status(500).json({ error: 'Internal error', detail: err?.message });
    }
}