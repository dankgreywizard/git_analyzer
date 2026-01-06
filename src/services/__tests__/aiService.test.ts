import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAIService, OllamaAIService, ExternalAIService } from '../aiService';
import ollama from 'ollama';
import { configService } from '../configService';

vi.mock('ollama', () => ({
    default: {
        chat: vi.fn(),
    },
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

    it('should return OllamaAIService by default (no apiKey in config)', () => {
        vi.mocked(configService.getConfig).mockReturnValue({});
        const service = getAIService();
        expect(service).toBeInstanceOf(OllamaAIService);
    });

    it('should return ExternalAIService if apiKey is in config', () => {
        vi.mocked(configService.getConfig).mockReturnValue({ apiKey: 'test-key' });
        const service = getAIService();
        expect(service).toBeInstanceOf(ExternalAIService);
    });

    it('ExternalAIService should use baseUrl from config', async () => {
        vi.mocked(configService.getConfig).mockReturnValue({ 
            apiKey: 'test-key',
            baseUrl: 'https://custom.api/v1'
        });
        
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'hello' } }] })
        } as any);

        const service = getAIService();
        await service.chat({ model: 'test-model', messages: [{ role: 'user', content: 'hi' }] });

        expect(fetchSpy).toHaveBeenCalledWith('https://custom.api/v1/chat/completions', expect.any(Object));
    });

    it('ExternalAIService.listModels should use availableModels from config', async () => {
        vi.mocked(configService.getConfig).mockReturnValue({ 
            apiKey: 'test-key',
            availableModels: 'model-a, model-b'
        });

        const service = new ExternalAIService('test-key');
        const models = await service.listModels();

        expect(models).toEqual(['model-a', 'model-b']);
    });

    it('ExternalAIService.listModels should return defaults if availableModels missing', async () => {
        vi.mocked(configService.getConfig).mockReturnValue({ apiKey: 'test-key' });

        const service = new ExternalAIService('test-key');
        const models = await service.listModels();

        expect(models).toContain('gpt-4');
    });
});
