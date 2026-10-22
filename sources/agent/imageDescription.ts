import { toBase64 } from '../utils/base64';
import { postAPI } from '../modules/apiClient';

export async function imageDescription(src: Uint8Array): Promise<string> {
    const data = await postAPI('/api/describe', { image: toBase64(src) });
    if (typeof data.description === 'string' && data.description.trim()) return data.description;
    throw new Error('Vision service returned an empty description.');
}
export async function llamaFind(question: string, images: string): Promise<string> {
    const data = await postAPI('/api/chat', { question, context: images });
    if (typeof data.answer === 'string' && data.answer.trim()) return data.answer;
    throw new Error('Chat service returned an empty answer.');
}
export const openAIFind = llamaFind;
