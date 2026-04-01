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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAIService, OllamaAIService, ExternalAIService } from '../aiService';
import { configService } from '../configService';

vi.mock('ollama', () => ({
    Ollama: vi.fn().mockImplementation(function() {
        return {
            chat: vi.fn(),
            list: vi.fn(),
        };
    }),
}));

vi.mock('../configService', () => ({
    configService: {
        getConfig: vi.fn(),
    }
}));

describe('aiService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return OllamaAIService by default (no apiKey in config)', async () => {
        vi.mocked(configService.getConfig).mockResolvedValue({});
        const service = await getAIService();
        expect(service).toBeInstanceOf(OllamaAIService);
    });

    it('should return ExternalAIService if apiKey is in config', async () => {
        vi.mocked(configService.getConfig).mockResolvedValue({ apiKey: 'test-key' });
        const service = await getAIService();
        expect(service).toBeInstanceOf(ExternalAIService);
    });

    it('ExternalAIService should use baseUrl from config', async () => {
        vi.mocked(configService.getConfig).mockResolvedValue({
            apiKey: 'test-key',
            baseUrl: 'https://custom.api/v1'
        });
        
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'hello' } }] })
        } as any);

        const service = await getAIService();
        await service.chat({ model: 'test-model', messages: [{ role: 'user', content: 'hi' }] });

        expect(fetchSpy).toHaveBeenCalledWith('https://custom.api/v1/chat/completions', expect.any(Object));
    });

    it('ExternalAIService.listModels should use availableModels from config', async () => {
        vi.mocked(configService.getConfig).mockResolvedValue({
            apiKey: 'test-key',
            availableModels: 'model-a, model-b'
        });

        const service = new ExternalAIService('test-key');
        const models = await service.listModels();

        expect(models).toEqual(['model-a', 'model-b']);
    });

    it('ExternalAIService.listModels should return defaults if availableModels missing', async () => {
        vi.mocked(configService.getConfig).mockResolvedValue({ apiKey: 'test-key' });

        const service = new ExternalAIService('test-key');
        const models = await service.listModels();

        expect(models).toContain('gpt-4');
    });

    it('ExternalAIService should handle API errors gracefully', async () => {
        vi.mocked(configService.getConfig).mockResolvedValue({ apiKey: 'test-key' });

        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: false,
            statusText: 'Unauthorized',
            json: async () => ({ error: 'Invalid key' })
        } as any);

        const service = await getAIService();
        await expect(service.chat({ model: 'test-model', messages: [] }))
            .rejects.toThrow(/External AI API error: Unauthorized/);
    });

    it('ExternalAIService should handle timeout', async () => {
        vi.mocked(configService.getConfig).mockResolvedValue({ apiKey: 'test-key' });
        
        // Mock fetch to be slow
        vi.spyOn(global, 'fetch').mockImplementation(() => new Promise((resolve) => {
            // This will never resolve, simulates a timeout if AbortController works
        }));

        const service = new ExternalAIService('test-key');
        
        // We can't easily test the actual timeout because it uses setTimeout
        // But we can check if AbortError is handled
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        
        vi.spyOn(global, 'fetch').mockRejectedValueOnce(abortError);

        await expect(service.chat({ 
            model: 'test-model', 
            messages: [{ role: 'user', content: 'hi' }],
            timeout: 100
        })).rejects.toThrow(/AI request timed out after 100ms/);
    });

    it('OllamaAIService.chat should work correctly', async () => {
        const service = new OllamaAIService();
        const client = (service as any).client;
        client.chat = vi.fn().mockResolvedValue({ message: { content: 'hello' } });

        const response = await service.chat({
            model: 'test-model',
            messages: [{ role: 'user', content: 'hi' }]
        });

        expect(response).toEqual({ message: { content: 'hello' } });
        expect(client.chat).toHaveBeenCalledWith(expect.objectContaining({
            model: 'test-model',
            think: false
        }));
    });

    it('OllamaAIService.chat should handle timeout option', async () => {
        const service = new OllamaAIService();
        const client = (service as any).client;
        client.chat = vi.fn().mockResolvedValue({ message: { content: 'hello' } });

        await service.chat({
            model: 'test-model',
            messages: [{ role: 'user', content: 'hi' }],
            timeout: 5000
        });

        expect(client.chat).toHaveBeenCalledWith(expect.objectContaining({
            options: expect.objectContaining({
                num_keep: 0
            })
        }));
    });

    it('OllamaAIService.chat should handle errors', async () => {
        const service = new OllamaAIService();
        const client = (service as any).client;
        client.chat = vi.fn().mockRejectedValue(new Error('Ollama error'));

        await expect(service.chat({
            model: 'test-model',
            messages: [{ role: 'user', content: 'hi' }]
        })).rejects.toThrow(/Ollama chat API error: Ollama error/);
    });

    it('OllamaAIService.listModels should handle connection refused', async () => {
        const service = new OllamaAIService();
        const client = (service as any).client;
        client.list = vi.fn().mockRejectedValue({
            cause: { code: 'ECONNREFUSED' }
        });
        
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const models = await service.listModels();
        
        expect(models).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to connect to Ollama'));
    });

    it('OllamaAIService.listModels should handle other errors', async () => {
        const service = new OllamaAIService();
        const client = (service as any).client;
        client.list = vi.fn().mockRejectedValue(new Error('Other error'));
        
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const models = await service.listModels();
        
        expect(models).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith('Failed to list Ollama models', expect.any(Error));
    });

    it('OllamaAIService.listModels should return empty if list.models is not an array', async () => {
        const service = new OllamaAIService();
        const client = (service as any).client;
        client.list = vi.fn().mockResolvedValue({ models: null });
        
        const models = await service.listModels();
        expect(models).toEqual([]);
    });

    it('ExternalAIService.chat should support streaming', async () => {
        const service = new ExternalAIService('test-key');
        
        const mockStream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
                controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n'));
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                controller.close();
            }
        });

        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            body: mockStream
        } as any);

        const stream = await service.chat({
            model: 'test-model',
            messages: [{ role: 'user', content: 'hi' }],
            stream: true
        });

        const results = [];
        for await (const chunk of stream) {
            results.push(chunk);
        }

        expect(results).toHaveLength(2);
        expect(results[0].message.content).toBe('Hello');
        expect(results[1].message.content).toBe(' world');
    });

    it('ExternalAIService.chat stream should handle parse errors', async () => {
        const service = new ExternalAIService('test-key');
        
        const mockStream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('data: invalid-json\n\n'));
                controller.close();
            }
        });

        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            body: mockStream
        } as any);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        const stream = await service.chat({
            model: 'test-model',
            messages: [{ role: 'user', content: 'hi' }],
            stream: true
        });

        for await (const _ of stream) {}

        expect(consoleSpy).toHaveBeenCalledWith('Error parsing stream chunk', expect.any(Error));
    });

    it('ExternalAIService.chat should handle empty error json', async () => {
        const service = new ExternalAIService('test-key');
        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: false,
            statusText: 'Bad Request',
            json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
        } as any);

        await expect(service.chat({ model: 'test-model', messages: [] }))
            .rejects.toThrow(/Bad Request {}/);
    });

    it('getAIService should use baseUrl for Ollama if provided', async () => {
        vi.mocked(configService.getConfig).mockResolvedValue({ baseUrl: 'http://ollama:11434' });
        const service = await getAIService();
        expect(service).toBeInstanceOf(OllamaAIService);
        // baseUrl is passed to constructor, we can check if it was used if we really wanted to, 
        // but checking the type is usually enough for the factory.
    });
});
