import type { VercelRequest, VercelResponse } from '@vercel/node';

// Serverless proxy: receives { question, context } and calls Groq (preferred)
// or OpenAI (fallback) chat-completions using server-side API keys.
// API keys NEVER ship to the browser.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = (context: string) => `
You are a smart AI that need to read through description of a images and answer user's questions.

This are the provided images:
${context}

DO NOT mention the images, scenes or descriptions in your answer, just answer the question.
DO NOT try to generalize or provide possible scenarios.
ONLY use the information in the description of the images to answer the question.
BE concise and specific.
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { question, context } = req.body ?? {};
    if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Missing "question" in body' });
        return;
    }
    const ctx = typeof context === 'string' ? context : '';

    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!groqKey && !openaiKey) {
        res.status(500).json({ error: 'No LLM API key configured on server' });
        return;
    }

    // Prefer Groq (fast + free tier), fall back to OpenAI if Groq is missing/unavailable.
    if (groqKey) {
        try {
            const resp = await fetch(GROQ_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: process.env.GROQ_CHAT_MODEL || 'llama3-70b-8192',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT(ctx) },
                        { role: 'user', content: question },
                    ],
                }),
            });
            if (!resp.ok) {
                const errText = await resp.text();
                console.warn('Groq chat failed:', resp.status, errText);
                if (openaiKey) {
                    return await callOpenAI(openaiKey, ctx, question, res);
                }
                res.status(502).json({ error: 'Groq error', detail: errText, status: resp.status });
                return;
            }
            const data: any = await resp.json();
            const answer: string = data?.choices?.[0]?.message?.content ?? '';
            res.status(200).json({ answer });
            return;
        } catch (err: any) {
            console.warn('Groq chat threw, falling back to OpenAI:', err?.message);
            if (openaiKey) {
                return await callOpenAI(openaiKey, ctx, question, res);
            }
            res.status(500).json({ error: 'Internal error', detail: err?.message });
            return;
        }
    }

    // Only OpenAI key configured.
    return await callOpenAI(openaiKey!, ctx, question, res);
}

async function callOpenAI(
    openaiKey: string,
    context: string,
    question: string,
    res: VercelResponse,
) {
    try {
        const resp = await fetch(OPENAI_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT(context) },
                    { role: 'user', content: question },
                ],
            }),
        });
        if (!resp.ok) {
            const errText = await resp.text();
            res.status(502).json({ error: 'OpenAI error', detail: errText, status: resp.status });
            return;
        }
        const data: any = await resp.json();
        const answer: string = data?.choices?.[0]?.message?.content ?? '';
        res.status(200).json({ answer });
    } catch (err: any) {
        console.error('OpenAI chat error:', err);
        res.status(500).json({ error: 'Internal error', detail: err?.message });
    }
}
