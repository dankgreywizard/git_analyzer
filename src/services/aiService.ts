/**
 * Copyright 2026 Robert Wheeler(dankgreywizard)
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
import { Ollama } from 'ollama';
import { Message } from '../types/chat';
import { configService } from './configService';

/**
 * Interface for AI service providers.
 */
export interface AIService {
    /**
     * Sends a chat request to the AI service.
     * @param options The chat options including model and messages.
     * @returns The AI response, either as a promise or an async iterable.
     */
    chat(options: {
        model: string;
        messages: Message[];
        stream?: boolean;
        timeout?: number;
    }): Promise<AsyncIterable<any> | any>;
    /**
     * Lists the available AI models for the service.
     * @returns A promise that resolves to an array of model names.
     */
    listModels(): Promise<string[]>;
}

/**
 * Base class for AI services providing common functionality.
 */
export abstract class BaseAIService implements AIService {
    abstract chat(options: {
        model: string;
        messages: Message[];
        stream?: boolean;
        timeout?: number;
    }): Promise<AsyncIterable<any> | any>;

    abstract listModels(): Promise<string[]>;

    /**
     * Handles errors from AI service calls and provides context.
     * @param error The error object.
     * @param context A description of where the error occurred.
     * @param timeout The timeout value in milliseconds, if applicable.
     */
    protected handleError(error: any, context: string, timeout?: number): never {
        if (error.name === 'AbortError') {
            throw new Error(`AI request timed out after ${timeout}ms`);
        }
        throw new Error(`${context} API error: ${error.message || String(error)}`);
    }
}

/**
 * AI service implementation for Ollama.
 */
export class OllamaAIService extends BaseAIService {
    private client: Ollama;

    /**
     * Initializes a new instance of the OllamaAIService class.
     * @param baseUrl The base URL of the Ollama API.
     */
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
        } catch (error: any) {
            this.handleError(error, 'Ollama chat', options.timeout);
        }
    }

    async listModels(): Promise<string[]> {
        try {
            const modelList: any = await this.client.list();
            return Array.isArray(modelList?.models) ? modelList.models.map((model: any) => model.name).filter(Boolean) : [];
        } catch (error: any) {
            if (error.cause?.code === 'ECONNREFUSED') {
                // @ts-ignore - access private config for better error message
                const host = this.client.config?.host || 'http://localhost:11434';
                console.error(`Failed to connect to Ollama at ${host}. If running in Docker, see README for connection instructions.`);
            } else {
                console.error('Failed to list Ollama models', error);
            }
            return [];
        }
    }
}

    /**
     * AI service implementation for an external provider (e.g., OpenAI, Claude).
     */
    export class ExternalAIService extends BaseAIService {
    /**
     * Initializes a new instance of the ExternalAIService class.
     * @param apiKey The API key for the service.
     * @param baseUrl The base URL of the service API.
     */
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
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`${response.statusText} ${JSON.stringify(errorData)}`);
            }

            if (options.stream) {
                return this.makeStream(response.body!);
            } else {
                return await response.json();
            }
        } catch (error: any) {
            this.handleError(error, 'External AI', options.timeout);
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
                    } catch (parseError) {
                        console.error('Error parsing stream chunk', parseError);
                    }
                }
            }
        }
    }
}

    /**
     * Creates and returns the appropriate AI service instance based on configuration.
     * @returns A promise that resolves to an AIService instance.
     */
    /**
     * Factory function that returns the appropriate AIService implementation based on the application configuration.
     * @returns A promise that resolves to an AIService instance (either Ollama or an external provider).
     */
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
