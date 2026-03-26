import { Ollama } from 'ollama';
import { Message } from '../types/chat';
import { configService } from './configService';

export interface AIService {
    chat(options: {
        model: string;
        messages: Message[];
        stream?: boolean;
        timeout?: number;
    }): Promise<AsyncIterable<any> | any>;
    listModels(): Promise<string[]>;
}

export abstract class BaseAIService implements AIService {
    abstract chat(options: {
        model: string;
        messages: Message[];
        stream?: boolean;
        timeout?: number;
    }): Promise<AsyncIterable<any> | any>;

    abstract listModels(): Promise<string[]>;

    protected handleError(e: any, context: string, timeout?: number): never {
        if (e.name === 'AbortError') {
            throw new Error(`AI request timed out after ${timeout}ms`);
        }
        throw new Error(`${context} API error: ${e.message || String(e)}`);
    }
}

export class OllamaAIService extends BaseAIService {
    private client: Ollama;

    constructor(baseUrl?: string) {
        super();
        this.client = new Ollama(baseUrl ? { host: baseUrl } : undefined);
    }

    async chat(options: {
        model: string;
        messages: Message[];
        stream?: boolean;
        timeout?: number;
    }) {
        try {
            const chatOptions: any = {
                ...options,
                think: false,
            };
            if (options.timeout) {
                chatOptions.options = {
                    ...(chatOptions.options || {}),
                    num_keep: 0,
                };
            }
            return await this.client.chat(chatOptions);
        } catch (e: any) {
            this.handleError(e, 'Ollama chat', options.timeout);
        }
    }

    async listModels(): Promise<string[]> {
        try {
            const list: any = await this.client.list();
            return Array.isArray(list?.models) ? list.models.map((m: any) => m.name).filter(Boolean) : [];
        } catch (e: any) {
            if (e.cause?.code === 'ECONNREFUSED') {
                // @ts-ignore - access private config for better error message
                const host = this.client.config?.host || 'http://localhost:11434';
                console.error(`Failed to connect to Ollama at ${host}. If running in Docker, see README for connection instructions.`);
            } else {
                console.error('Failed to list Ollama models', e);
            }
            return [];
        }
    }
}

export class ExternalAIService extends BaseAIService {
    constructor(private apiKey: string, private baseUrl: string = 'https://api.openai.com/v1') {
        super();
    }

    async chat(options: {
        model: string;
        messages: Message[];
        stream?: boolean;
        timeout?: number;
    }) {
        const controller = new AbortController();
        const timeoutId = options.timeout ? setTimeout(() => controller.abort(), options.timeout) : null;

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: options.model,
                    messages: options.messages.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    stream: options.stream
                }),
                signal: controller.signal
            });

            if (timeoutId) clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(`${response.statusText} ${JSON.stringify(error)}`);
            }

            if (options.stream) {
                return this.makeStream(response.body!);
            } else {
                return await response.json();
            }
        } catch (e: any) {
            this.handleError(e, 'External AI', options.timeout);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    async listModels(): Promise<string[]> {
        const config = await configService.getConfig();
        return config.availableModels ? config.availableModels.split(',').map(m => m.trim()) : ['gpt-3.5-turbo', 'gpt-4', 'claude-3-opus-20240229'];
    }

    private async *makeStream(responseBody: ReadableStream<Uint8Array>) {
        const reader = responseBody.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (trimmed.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(trimmed.slice(6));
                        yield {
                            message: {
                                role: 'assistant',
                                content: data.choices[0]?.delta?.content || ''
                            }
                        };
                    } catch (e) {
                        console.error('Error parsing stream chunk', e);
                    }
                }
            }
        }
    }
}

export async function getAIService(): Promise<AIService> {
    const config = await configService.getConfig();
    const apiKey = config.apiKey;
    const baseUrl = config.baseUrl;
    
    if (apiKey) {
        console.log("Using external AI provider");
        return new ExternalAIService(apiKey, baseUrl || 'https://api.openai.com/v1');
    }
    console.log("Using Ollama provider" + (baseUrl ? ` at ${baseUrl}` : ""));
    return new OllamaAIService(baseUrl);
}
