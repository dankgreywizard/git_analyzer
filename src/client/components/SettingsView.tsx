import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';

interface AIConfig {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    availableModels?: string;
}

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
                body: JSON.stringify(config),
            });
            if (response.ok) {
                setStatus({ message: 'Configuration saved successfully', type: 'success' });
            } else {
                throw new Error('Failed to save');
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
        <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md mt-10">
            <div className="flex items-center mb-6 border-b pb-4 dark:border-gray-700">
                <SettingsIcon className="w-6 h-6 mr-2 text-gray-600 dark:text-gray-300" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Configuration</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
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
                    >
                        {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Configuration
                    </button>
                </div>
            </form>
        </div>
    );
}
