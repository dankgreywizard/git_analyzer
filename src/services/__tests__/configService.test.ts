import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService, configService as singleton } from '../configService';

describe('ConfigService', () => {
    let configService: ConfigService;

    beforeEach(async () => {
        vi.clearAllMocks();
        // Clear env variables
        delete process.env.AI_API_KEY;
        delete process.env.AI_BASE_URL;
        delete process.env.AI_MODEL;
        delete process.env.AI_MODELS;
        delete process.env.AI_SYSTEM_PROMPT;
        delete process.env.AI_PERSONA;
        delete process.env.AI_TIMEOUT;

        // Reset singleton to avoid cross-test contamination
        await (singleton as any).updateConfig({
            apiKey: '',
            baseUrl: '',
            defaultModel: '',
            availableModels: '',
            systemPrompt: '',
            persona: '',
            timeout: 0
        });
    });

    it('should initialize and return default config if no file exists', async () => {
        configService = new ConfigService(':memory:');
        const config = await configService.getConfig();

        expect(config.systemPrompt).toContain('expert code reviewer');
        expect(config.defaultModel).toBe('codellama:latest');
        expect(config.baseUrl).toBe('http://localhost:11434');
    });

    it('should load config from environment variables', async () => {
        process.env.AI_API_KEY = 'env-key';
        process.env.AI_BASE_URL = 'https://env.api';
        process.env.AI_SYSTEM_PROMPT = 'env-prompt';

        configService = new ConfigService(':memory:');
        const config = await configService.getConfig();

        expect(config.apiKey).toBe('env-key');
        expect(config.baseUrl).toBe('https://env.api');
        expect(config.systemPrompt).toBe('env-prompt');
    });

    it('should update and save config via LokiJS', async () => {
        configService = new ConfigService(':memory:');

        const newConfig = {
            apiKey: 'new-key',
            baseUrl: 'https://new.api',
            systemPrompt: 'new-prompt'
        };

        await configService.updateConfig(newConfig);
        const config = await configService.getConfig();

        expect(config.apiKey).toBe('new-key');
        expect(config.baseUrl).toBe('https://new.api');
        expect(config.systemPrompt).toBe('new-prompt');

        // Environment variables should also be updated for backward compatibility
        expect(process.env.AI_API_KEY).toBe('new-key');
        expect(process.env.AI_BASE_URL).toBe('https://new.api');
        expect(process.env.AI_SYSTEM_PROMPT).toBe('new-prompt');
    });

    it('should handle empty strings for apiKey by deleting the environment variable', async () => {
        process.env.AI_API_KEY = 'old-key';
        configService = new ConfigService(':memory:');

        await configService.updateConfig({ apiKey: '' });

        expect(process.env.AI_API_KEY).toBeUndefined();
    });

    it('should load persona and timeout from environment variables', async () => {
        process.env.AI_PERSONA = 'Security Analyst';
        process.env.AI_TIMEOUT = '60000';

        configService = new ConfigService(':memory:');
        const config = await configService.getConfig();

        expect(config.persona).toBe('Security Analyst');
        expect(config.timeout).toBe(60000);
    });

    it('should update and save persona and timeout', async () => {
        configService = new ConfigService(':memory:');

        const newConfig = {
            persona: 'Refactoring Specialist',
            timeout: 45000
        };

        await configService.updateConfig(newConfig);
        const config = await configService.getConfig();

        expect(config.persona).toBe('Refactoring Specialist');
        expect(config.timeout).toBe(45000);
        expect(process.env.AI_PERSONA).toBe('Refactoring Specialist');
        expect(process.env.AI_TIMEOUT).toBe('45000');
    });
});
