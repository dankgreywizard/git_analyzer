import fs from 'fs';
import path from 'path';

interface AIConfig {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    availableModels?: string;
}

const CONFIG_FILE = path.join(process.cwd(), 'data.json');

export class ConfigService {
    private config: AIConfig = {};

    constructor() {
        this.loadConfig();
    }

    private loadConfig() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
                const parsed = JSON.parse(data);
                this.config = parsed.aiConfig || {};
            }
        } catch (e) {
            console.error('Failed to load config', e);
        }
    }

    private saveConfig() {
        try {
            let fullConfig: any = {};
            if (fs.existsSync(CONFIG_FILE)) {
                const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
                try {
                    fullConfig = JSON.parse(data);
                } catch (e) {
                    fullConfig = {};
                }
            }
            fullConfig.aiConfig = this.config;
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(fullConfig, null, 2));
        } catch (e) {
            console.error('Failed to save config', e);
        }
    }

    getConfig(): AIConfig {
        const apiKey = this.config.apiKey || process.env.AI_API_KEY;
        const baseUrl = this.config.baseUrl || process.env.AI_BASE_URL;
        const defaultModel = this.config.defaultModel || process.env.AI_MODEL;

        return {
            apiKey: apiKey,
            // Default to OpenAI only if apiKey is provided and no baseUrl is set
            baseUrl: baseUrl || (apiKey ? 'https://api.openai.com/v1' : ''),
            // Default to codellama:latest only if no apiKey is provided
            defaultModel: defaultModel || (apiKey ? 'gpt-4o' : 'codellama:latest'),
            availableModels: this.config.availableModels || process.env.AI_MODELS,
        };
    }

    updateConfig(newConfig: AIConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
        
        // Update process.env for backward compatibility and immediate effect in getAIService
        if (newConfig.apiKey !== undefined) {
            if (newConfig.apiKey === '') delete process.env.AI_API_KEY;
            else process.env.AI_API_KEY = newConfig.apiKey;
        }
        if (newConfig.baseUrl !== undefined) process.env.AI_BASE_URL = newConfig.baseUrl;
        if (newConfig.defaultModel !== undefined) process.env.AI_MODEL = newConfig.defaultModel;
        if (newConfig.availableModels !== undefined) process.env.AI_MODELS = newConfig.availableModels;
    }
}

export const configService = new ConfigService();
