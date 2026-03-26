import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';

interface AIConfig {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    availableModels?: string;
    systemPrompt?: string;
    persona?: string;
    timeout?: number;
}

const PERSONA_PRESETS: Record<string, string> = {
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

export default function SettingsView() {
    const [config, setConfig] = useState<AIConfig>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const data = await response.json();
                setConfig(data);
            }
        } catch (e) {
            console.error('Failed to fetch config', e);
            setStatus({ message: 'Failed to load configuration', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setStatus({ message: '', type: '' });
        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...config,
                    persona: config.persona || 'Expert Code Reviewer'
                }),
            });
            if (response.ok) {
                setStatus({ message: 'Configuration saved successfully', type: 'success' });
            } else {
                console.error('Failed to save config: Server returned', response.status);
                setStatus({ message: 'Failed to save configuration', type: 'error' });
            }
        } catch (e) {
            console.error('Failed to save config', e);
            setStatus({ message: 'Failed to save configuration', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gray-50">
            <div className="max-w-3xl mx-auto p-8 my-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-8 pb-4 border-b border-gray-100">
                    <div className="p-2 bg-blue-50 rounded-lg mr-3">
                        <SettingsIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">AI Configuration</h2>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        AI API Key
                    </label>
                    <input
                        id="apiKey"
                        type="password"
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Leave empty for Ollama"
                        value={config.apiKey || ''}
                        onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        If provided, the app will use an external AI provider (OpenAI compatible). If empty, it defaults to Ollama.
                    </p>
                </div>

                <div>
                    <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        API Base URL
                    </label>
                    <input
                        id="baseUrl"
                        type="text"
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="https://api.openai.com/v1"
                        value={config.baseUrl || ''}
                        onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    />
                </div>

                <div>
                    <label htmlFor="defaultModel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Default AI Model
                    </label>
                    <input
                        id="defaultModel"
                        type="text"
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="e.g. gpt-4 or codellama:latest"
                        value={config.defaultModel || ''}
                        onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
                    />
                </div>

                <div>
                    <label htmlFor="timeout" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        AI Request Timeout (milliseconds)
                    </label>
                    <input
                        id="timeout"
                        type="number"
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="30000"
                        value={config.timeout || 30000}
                        onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) || 30000 })}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Maximum time to wait for a response from the AI provider.
                    </p>
                </div>

                <div>
                    <label htmlFor="availableModels" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Available Models (comma-separated)
                    </label>
                    <textarea
                        id="availableModels"
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        rows={3}
                        placeholder="gpt-3.5-turbo, gpt-4, claude-3-opus-20240229"
                        value={config.availableModels || ''}
                        onChange={(e) => setConfig({ ...config, availableModels: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Used to populate the model selector when an API Key is provided.
                    </p>
                </div>

                <div>
                    <label htmlFor="persona" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        AI Persona
                    </label>
                    <select
                        id="persona"
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={config.persona || 'Expert Code Reviewer'}
                        onChange={(e) => {
                            const newPersona = e.target.value;
                            const newPrompt = PERSONA_PRESETS[newPersona] || config.systemPrompt;
                            setConfig({ ...config, persona: newPersona, systemPrompt: newPrompt });
                        }}
                    >
                        {Object.keys(PERSONA_PRESETS).map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                        <option value="Custom">Custom</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        System Prompt (Advanced)
                    </label>
                    <textarea
                        id="systemPrompt"
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                        rows={8}
                        placeholder="Define how the AI should behave and what it should focus on..."
                        value={config.systemPrompt || ''}
                        onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        This persona defines the AI's role and analysis instructions for code reviews.
                    </p>
                </div>

                {status.message && (
                    <div className={`p-3 rounded-md text-sm ${
                        status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                        {status.message}
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition duration-200 disabled:opacity-50"
                        title="Save current AI settings to the server"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Configuration
                    </button>
                </div>
                </form>
            </div>
            </div>
        </div>
    );
}
