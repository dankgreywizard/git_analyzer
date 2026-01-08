import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsView from '../SettingsView';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Settings: () => <div data-testid="settings-icon" />,
    Save: () => <div data-testid="save-icon" />,
    RefreshCw: ({ className }: { className?: string }) => <div data-testid="refresh-icon" className={className} />,
}));

describe('SettingsView', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('should show loading state and then render config', async () => {
        const mockConfig = {
            apiKey: 'test-api-key',
            baseUrl: 'https://test.url',
            defaultModel: 'gpt-4',
            availableModels: 'gpt-4,gpt-3.5-turbo'
        };

        (vi.mocked(fetch) as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockConfig,
        });

        render(<SettingsView />);

        // Loading state
        expect(screen.getByTestId('refresh-icon')).toBeDefined();

        await waitFor(() => {
            expect(screen.getByLabelText(/AI API Key/i)).toHaveValue('test-api-key');
        });

        expect(screen.getByLabelText(/API Base URL/i)).toHaveValue('https://test.url');
        expect(screen.getByLabelText(/Default AI Model/i)).toHaveValue('gpt-4');
        expect(screen.getByLabelText(/Available Models/i)).toHaveValue('gpt-4,gpt-3.5-turbo');
    });

    it('should update state when inputs change', async () => {
        (vi.mocked(fetch) as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        });

        render(<SettingsView />);

        await waitFor(() => {
            expect(screen.queryByTestId('refresh-icon')).toBeNull();
        });

        const apiKeyInput = screen.getByLabelText(/AI API Key/i);
        fireEvent.change(apiKeyInput, { target: { value: 'new-key' } });
        expect(apiKeyInput).toHaveValue('new-key');
    });

    it('should save configuration when form is submitted', async () => {
        (vi.mocked(fetch) as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        });

        render(<SettingsView />);

        await waitFor(() => {
            expect(screen.queryByTestId('refresh-icon')).toBeNull();
        });

        const apiKeyInput = screen.getByLabelText(/AI API Key/i);
        fireEvent.change(apiKeyInput, { target: { value: 'saved-key' } });

        (vi.mocked(fetch) as any).mockResolvedValueOnce({
            ok: true,
        });

        const saveButton = screen.getByRole('button', { name: /Save Configuration/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText(/Configuration saved successfully/i)).toBeDefined();
        });

        expect(fetch).toHaveBeenCalledWith('/api/config', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ apiKey: 'saved-key' }),
        }));
    });

    it('should show error message if save fails', async () => {
        (vi.mocked(fetch) as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        });

        render(<SettingsView />);

        await waitFor(() => {
            expect(screen.queryByTestId('refresh-icon')).toBeNull();
        });

        (vi.mocked(fetch) as any).mockResolvedValueOnce({
            ok: false,
        });

        const saveButton = screen.getByRole('button', { name: /Save Configuration/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText(/Failed to save configuration/i)).toBeDefined();
        });
    });
});
