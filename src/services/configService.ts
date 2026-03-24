import path from 'path';
import loki from 'lokijs';

interface AIConfig {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    availableModels?: string;
    systemPrompt?: string;
    persona?: string;
    timeout?: number;
}

const PERSONA_PRESETS = {
    "Expert Code Reviewer": `You are an expert code reviewer. Analyze the following commits and provide a comprehensive, detailed review:
1) Executive Summary: A concise overview of the changes across ALL selected commits.
2) Detailed File Analysis: For EACH and EVERY commit provided, explain the purpose of the changes in the individual files based on the provided diffs. Do not skip any commits.
   - Describe what the new functionality actually does.
   - Highlight changes in logic flow or data structures.
   - Explain the "how" and "why" behind the code changes.
3) Architectural Impact: How these changes affect the overall system, including any modifications to interfaces or public APIs.
4) Risk Assessment: Identify potential bugs, edge cases, breaking changes, or security concerns.
5) Testing Strategy: Specific, actionable suggestions for verifying the new or changed functionality.

Your tone should be professional and constructive. Use the provided diffs to give specific examples in your explanation. Ensure your review covers all commits listed in the user prompt.`,
    "Concise Reviewer": `You are a concise code reviewer. Provide a brief and direct summary of the changes:
1) Summary of changes: A short paragraph on what changed.
2) Key Impacts: Major architectural or logic changes.
3) Critical Risks: Only mention if there are serious bugs or breaking changes.
Keep it very brief.`,
    "Security Analyst": `You are a security analyst specializing in code reviews. Analyze the changes for:
1) Security Vulnerabilities: Look for common flaws like injection, improper authentication, or data leaks.
2) Risk Assessment: Evaluate the overall security impact.
3) Hardening Recommendations: Suggest improvements to make the code more secure.`,
    "Refactoring Specialist": `You are a refactoring specialist. Focus on:
1) Code Quality: Suggest improvements to readability, maintainability, and clean code principles.
2) Design Patterns: Identify opportunities to use or improve design patterns.
3) Technical Debt: Highlight areas where technical debt is being added or reduced.`
};

const DEFAULT_SYSTEM_PROMPT = PERSONA_PRESETS["Expert Code Reviewer"];

const CONFIG_FILE = path.join(process.cwd(), 'data.json');

export class ConfigService {
    private config: AIConfig = {};
    private db: loki;
    private configCollection: Collection<AIConfig> | null = null;
    private initialized: Promise<void>;
    private resolveInitialized!: () => void;

    constructor(filePath: string = CONFIG_FILE) {
        this.initialized = new Promise((resolve) => {
            this.resolveInitialized = resolve;
        });
        const isMemory = filePath === ':memory:';
        this.db = new loki(filePath, {
            autoload: true,
            autoloadCallback: this.databaseInitialize.bind(this),
            autosave: !isMemory, // Disable autosave for memory DB
            autosaveInterval: 4000,
            persistenceMethod: isMemory ? 'memory' : 'fs'
        });
    }

    private databaseInitialize() {
        this.configCollection = this.db.getCollection<AIConfig>('config');
        if (this.configCollection === null) {
            this.configCollection = this.db.addCollection<AIConfig>('config');
        }
        
        const existing = this.configCollection.findOne({ type: 'aiConfig' } as any);
        if (existing) {
            this.config = (existing as any).data || {};
            // Update process.env with loaded config ONLY if process.env doesn't already have them
            if (this.config.apiKey && !process.env.AI_API_KEY) process.env.AI_API_KEY = this.config.apiKey;
            if (this.config.baseUrl && !process.env.AI_BASE_URL) process.env.AI_BASE_URL = this.config.baseUrl;
            if (this.config.defaultModel && !process.env.AI_MODEL) process.env.AI_MODEL = this.config.defaultModel;
            if (this.config.availableModels && !process.env.AI_MODELS) process.env.AI_MODELS = this.config.availableModels;
            if (this.config.systemPrompt && !process.env.AI_SYSTEM_PROMPT) process.env.AI_SYSTEM_PROMPT = this.config.systemPrompt;
        } else {
            this.config = {};
        }
        this.resolveInitialized();
    }

    private async ensureInitialized() {
        await this.initialized;
    }

    async getConfig(): Promise<AIConfig> {
        await this.ensureInitialized();
        // Priority: In-memory config > Process Env > Defaults
        const apiKey = this.config.apiKey !== undefined ? this.config.apiKey : process.env.AI_API_KEY;
        const baseUrl = this.config.baseUrl !== undefined ? this.config.baseUrl : process.env.AI_BASE_URL;
        const defaultModel = this.config.defaultModel !== undefined ? this.config.defaultModel : process.env.AI_MODEL;
        const systemPrompt = this.config.systemPrompt !== undefined ? this.config.systemPrompt : process.env.AI_SYSTEM_PROMPT;
        const availableModels = this.config.availableModels !== undefined ? this.config.availableModels : process.env.AI_MODELS;
        const persona = this.config.persona !== undefined ? this.config.persona : process.env.AI_PERSONA;
        const timeout = this.config.timeout !== undefined ? this.config.timeout : Number(process.env.AI_TIMEOUT);

        return {
            apiKey: apiKey,
            // Default to OpenAI only if apiKey is provided and no baseUrl is set
            baseUrl: baseUrl || (apiKey ? 'https://api.openai.com/v1' : 'http://localhost:11434'),
            // Default to codellama:latest only if no apiKey is provided
            defaultModel: defaultModel || (apiKey ? 'gpt-4o' : 'codellama:latest'),
            availableModels: availableModels,
            systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
            persona: persona || "Expert Code Reviewer",
            timeout: timeout || 30000,
        };
    }

    async updateConfig(newConfig: AIConfig) {
        await this.ensureInitialized();
        // Only merge properties that are actually present in newConfig
        for (const key in newConfig) {
            if (Object.prototype.hasOwnProperty.call(newConfig, key)) {
                (this.config as any)[key] = (newConfig as any)[key];
            }
        }
        
        if (this.configCollection) {
            let existing = this.configCollection.findOne({ type: 'aiConfig' } as any);
            if (existing) {
                (existing as any).data = { ...this.config };
                this.configCollection.update(existing);
            } else {
                this.configCollection.insert({ type: 'aiConfig', data: { ...this.config } } as any);
            }
        }
        this.db.saveDatabase();
        
        // Update process.env for backward compatibility and immediate effect
        if (newConfig.apiKey !== undefined) {
            if (newConfig.apiKey === '') delete process.env.AI_API_KEY;
            else process.env.AI_API_KEY = newConfig.apiKey;
        }
        if (newConfig.baseUrl !== undefined) {
            if (newConfig.baseUrl === '') delete process.env.AI_BASE_URL;
            else process.env.AI_BASE_URL = newConfig.baseUrl;
        }
        if (newConfig.defaultModel !== undefined) {
            if (newConfig.defaultModel === '') delete process.env.AI_MODEL;
            else process.env.AI_MODEL = newConfig.defaultModel;
        }
        if (newConfig.availableModels !== undefined) {
            if (newConfig.availableModels === '') delete process.env.AI_MODELS;
            else process.env.AI_MODELS = newConfig.availableModels;
        }
        if (newConfig.systemPrompt !== undefined) {
            if (newConfig.systemPrompt === '') delete process.env.AI_SYSTEM_PROMPT;
            else process.env.AI_SYSTEM_PROMPT = newConfig.systemPrompt;
        }
        if (newConfig.persona !== undefined) {
            if (newConfig.persona === '') delete process.env.AI_PERSONA;
            else process.env.AI_PERSONA = newConfig.persona;
        }
        if (newConfig.timeout !== undefined) {
            if (newConfig.timeout === 0) delete process.env.AI_TIMEOUT;
            else process.env.AI_TIMEOUT = String(newConfig.timeout);
        }
    }
}

export const configService = new ConfigService();
