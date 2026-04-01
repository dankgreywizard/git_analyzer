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
            availableModels: 'gpt-4,gpt-3.5-turbo',
            systemPrompt: 'test-system-prompt',
            maxDiffLength: 10000
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
        expect(screen.getByLabelText(/System Prompt/i)).toHaveValue('test-system-prompt');
        expect(screen.getByLabelText(/Max Diff Character Limit/i)).toHaveValue(10000);
    });

    it('should update state when inputs change', async () => {
        (vi.mocked(fetch) as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ maxDiffLength: 15000 }),
        });

        render(<SettingsView />);

        await waitFor(() => {
            expect(screen.queryByTestId('refresh-icon')).toBeNull();
        });

        const apiKeyInput = screen.getByLabelText(/AI API Key/i);
        fireEvent.change(apiKeyInput, { target: { value: 'new-key' } });
        expect(apiKeyInput).toHaveValue('new-key');

        const maxDiffInput = screen.getByLabelText(/Max Diff Character Limit/i);
        fireEvent.change(maxDiffInput, { target: { value: '25000' } });
        expect(maxDiffInput).toHaveValue(25000);
    });

    it('should save configuration when form is submitted', async () => {
        (vi.mocked(fetch) as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ maxDiffLength: 10000 }),
        });

        render(<SettingsView />);

        await waitFor(() => {
            expect(screen.queryByTestId('refresh-icon')).toBeNull();
        });

        const apiKeyInput = screen.getByLabelText(/AI API Key/i);
        fireEvent.change(apiKeyInput, { target: { value: 'saved-key' } });

        const systemPromptInput = screen.getByLabelText(/System Prompt/i);
        fireEvent.change(systemPromptInput, { target: { value: 'saved-prompt' } });

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
            body: expect.stringContaining('"apiKey":"saved-key"'),
        }));
    });

    it('should update persona and system prompt when persona is changed', async () => {
        const mockConfig = {
            apiKey: 'test-api-key',
            persona: 'Expert Code Reviewer',
            systemPrompt: 'Initial prompt',
            maxDiffLength: 10000
        };

        (vi.mocked(fetch) as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockConfig,
        });

        render(<SettingsView />);

        await waitFor(() => {
            expect(screen.getByLabelText(/AI Persona/i)).toHaveValue('Expert Code Reviewer');
        });

        const personaSelect = screen.getByLabelText(/AI Persona/i);
        fireEvent.change(personaSelect, { target: { value: 'Security Analyst' } });

        expect(personaSelect).toHaveValue('Security Analyst');
        // Check if system prompt updated to Security Analyst preset
        await waitFor(() => {
            const promptValue = (screen.getByLabelText(/System Prompt/i) as HTMLTextAreaElement).value;
            expect(promptValue.toLowerCase()).toContain('security analyst');
        });

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
            body: expect.stringContaining('"persona":"Security Analyst"'),
        }));
    });

    it('should handle custom timeout input', async () => {
        (vi.mocked(fetch) as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ timeout: 30000, maxDiffLength: 10000 }),
        });

        render(<SettingsView />);

        await waitFor(() => {
            expect(screen.getByLabelText(/AI Request Timeout/i)).toHaveValue(30000);
        });

        const timeoutInput = screen.getByLabelText(/AI Request Timeout/i);
        fireEvent.change(timeoutInput, { target: { value: '60000' } });

        expect(timeoutInput).toHaveValue(60000);

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
            body: expect.stringContaining('"timeout":60000'),
        }));
    });

    it('should show error message if save fails', async () => {
        (vi.mocked(fetch) as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ maxDiffLength: 10000 }),
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
