export async function postAPI(path: string, body: unknown) {
    // Absolute origin is needed by the Node prompt evaluator; browsers use same-origin.
    const origin = process.env.EXPO_PUBLIC_API_URL || '';
    if (typeof window === 'undefined' && !origin) throw new Error('Set EXPO_PUBLIC_API_URL to your running API server before evaluating prompts.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
        const response = await fetch(origin.replace(/\/$/, '') + path, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body), signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || ('AI service failed (' + response.status + '). Please try again.'));
        if (!data) throw new Error('AI endpoint did not return JSON. Run the API server as well as the web app.');
        return data;
    } catch (error) {
        if ((error as Error).name === 'AbortError') throw new Error('AI request timed out. Please try again.');
        throw error;
    } finally { clearTimeout(timer); }
}
