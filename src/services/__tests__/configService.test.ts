import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ConfigService } from '../configService';

vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn(),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
    }
}));
const mockedFs = fs as any;

describe('ConfigService', () => {
    const CONFIG_FILE = path.join(process.cwd(), 'data.json');
    let configService: ConfigService;

    beforeEach(() => {
        vi.clearAllMocks();
        // Clear env variables
        delete process.env.AI_API_KEY;
        delete process.env.AI_BASE_URL;
        delete process.env.AI_MODEL;
        delete process.env.AI_MODELS;
    });

    it('should load config from file if it exists', () => {
        const mockConfig = {
            aiConfig: {
                apiKey: 'test-key',
                baseUrl: 'https://test.api',
                defaultModel: 'test-model',
                availableModels: 'model1,model2'
            }
        };
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

        configService = new ConfigService();
        const config = configService.getConfig();

        expect(config.apiKey).toBe('test-key');
        expect(config.baseUrl).toBe('https://test.api');
        expect(config.defaultModel).toBe('test-model');
        expect(config.availableModels).toBe('model1,model2');
    });

    it('should fall back to environment variables if file config is missing', () => {
        mockedFs.existsSync.mockReturnValue(false);
        process.env.AI_API_KEY = 'env-key';
        process.env.AI_BASE_URL = 'https://env.api';

        configService = new ConfigService();
        const config = configService.getConfig();

        expect(config.apiKey).toBe('env-key');
        expect(config.baseUrl).toBe('https://env.api');
        expect(config.defaultModel).toBeUndefined();
    });

    it('should update and save config', () => {
        mockedFs.existsSync.mockReturnValue(false);
        configService = new ConfigService();

        const newConfig = {
            apiKey: 'new-key',
            baseUrl: 'https://new.api'
        };

        configService.updateConfig(newConfig);

        expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
            CONFIG_FILE,
            expect.stringContaining('"apiKey": "new-key"')
        );
        expect(process.env.AI_API_KEY).toBe('new-key');
        expect(process.env.AI_BASE_URL).toBe('https://new.api');
    });

    it('should delete AI_API_KEY from env if updated with empty string', () => {
        process.env.AI_API_KEY = 'some-key';
        mockedFs.existsSync.mockReturnValue(false);
        configService = new ConfigService();

        configService.updateConfig({ apiKey: '' });

        expect(process.env.AI_API_KEY).toBeUndefined();
    });

    it('should preserve existing data.json content when saving', () => {
        const existingData = { otherKey: 'otherValue' };
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingData));
        
        configService = new ConfigService();
        configService.updateConfig({ apiKey: 'new-key' });

        const saveCall = mockedFs.writeFileSync.mock.calls[0];
        const savedData = JSON.parse(saveCall[1] as string);
        
        expect(savedData.otherKey).toBe('otherValue');
        expect(savedData.aiConfig.apiKey).toBe('new-key');
    });
});
