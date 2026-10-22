import * as React from 'react';
import { AsyncLock } from '../utils/lock';
import { imageDescription, llamaFind } from './imageDescription';

type AgentState = { lastDescription?: string; answer?: string; error?: string; loading: boolean; described: number };
export class Agent {
    #lock = new AsyncLock();
    #descriptions: string[] = [];
    #state: AgentState = { loading: false, described: 0 };
    #stateCopy: AgentState = { ...this.#state };
    #stateListeners: (() => void)[] = [];
    onPhotoProcessed?: (photo: Uint8Array, description: string) => void | Promise<void>;
    constructor(private describe = imageDescription, private find = llamaFind) {}
    async addPhoto(photos: Uint8Array[]) {
        await this.#lock.inLock(async () => {
            for (const photo of photos) {
                try {
                    const description = await this.describe(photo);
                    this.#descriptions.push(description);
                    this.#descriptions = this.#descriptions.slice(-24);
                    this.#state.lastDescription = description;
                    this.#state.described++;
                    this.#state.error = undefined;
                    this.#notify();
                    await this.onPhotoProcessed?.(photo, description);
                } catch (error) {
                    this.#state.error = (error as Error).message || 'Photo processing failed. The next capture will be tried.';
                    this.#notify();
                }
            }
        });
    }
    async answer(question: string): Promise<string | undefined> {
        if (this.#state.loading || !question.trim()) return;
        this.#state.loading = true;
        this.#state.answer = undefined;
        this.#state.error = undefined;
        this.#notify();
        try {
            return await this.#lock.inLock(async () => {
                if (!this.#descriptions.length) throw new Error('Wait for a scene description before asking a question.');
                const context = this.#descriptions.map((description, i) => 'Image #' + i + '\n' + description).join('\n\n').slice(-48000);
                const answer = await this.find(question.trim(), context);
                this.#state.answer = answer;
                return answer;
            });
        } catch (error) {
            this.#state.error = (error as Error).message || 'Could not answer. Please try again.';
            return undefined;
        } finally { this.#state.loading = false; this.#notify(); }
    }
    getState() { return this.#stateCopy; }
    #notify = () => { this.#stateCopy = { ...this.#state }; this.#stateListeners.forEach(listener => listener()); };
    use() {
        const [state, setState] = React.useState(this.#stateCopy);
        React.useEffect(() => {
            const listener = () => setState(this.#stateCopy);
            this.#stateListeners.push(listener);
            listener();
            return () => { this.#stateListeners = this.#stateListeners.filter(l => l !== listener); };
        }, []);
        return state;
    }
}
