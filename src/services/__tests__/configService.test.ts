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

    it('should handle clearing config values with empty strings or 0', async () => {
        process.env.AI_MODEL = 'old-model';
        process.env.AI_MODELS = 'm1,m2';
        process.env.AI_PERSONA = 'old-persona';
        process.env.AI_TIMEOUT = '1000';
        process.env.AI_MAX_DIFF_LENGTH = '50000';

        configService = new ConfigService(':memory:');
        
        await configService.updateConfig({
            defaultModel: '',
            availableModels: '',
            persona: '',
            timeout: 0,
            maxDiffLength: 0
        });

        expect(process.env.AI_MODEL).toBeUndefined();
        expect(process.env.AI_MODELS).toBeUndefined();
        expect(process.env.AI_PERSONA).toBeUndefined();
        expect(process.env.AI_TIMEOUT).toBeUndefined();
        expect(process.env.AI_MAX_DIFF_LENGTH).toBeUndefined();
    });
});
