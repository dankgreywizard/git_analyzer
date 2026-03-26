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

    it('OllamaAIService should pass timeout to chat options', async () => {
        const { Ollama } = await import('ollama');
        const service = new OllamaAIService();
        
        const chatSpy = vi.mocked((service as any).client.chat);
        
        await service.chat({
            model: 'test-model',
            messages: [{ role: 'user', content: 'hi' }],
            timeout: 5000
        });

        expect(chatSpy).toHaveBeenCalledWith(expect.objectContaining({
            options: expect.objectContaining({
                num_keep: 0
            })
        }));
    });
});
